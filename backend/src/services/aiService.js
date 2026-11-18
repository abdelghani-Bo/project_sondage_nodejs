const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');

const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;
if (apiKey && apiKey.trim() !== '') {
  try {
    genAI = new GoogleGenerativeAI(apiKey.trim());
  } catch (err) {
    console.warn('Gemini AI initialization warning:', err.message);
  }
}

/**
 * Extract text from uploaded PDF buffer or string
 */
async function extractTextFromPDF(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (err) {
    console.error('Error parsing PDF:', err);
    return '';
  }
}

/**
 * Smart Local AI Generator (Fallback or direct engine)
 * Produces structured pedagogical QCM questions tailored to theme & difficulty
 */
function generateFallbackQuestions(theme, difficulty = 'Intermédiaire', textContent = '', count = 5) {
  const normalizedTheme = (theme || 'Général').toLowerCase();
  
  // Dynamic template questions based on extracted text or theme keywords
  const pool = [];

  if (textContent && textContent.length > 50) {
    // Generate questions directly from document sentences
    const sentences = textContent
      .split(/[.!?]\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 30 && s.length < 180);

    for (let i = 0; i < Math.min(count, Math.max(sentences.length, 3)); i++) {
      const sentence = sentences[i % sentences.length];
      const words = sentence.split(' ');
      const keyWord = words.find(w => w.length > 6) || 'ce concept';
      
      pool.push({
        questionText: `D'après le support de cours : "${sentence.substring(0, 100)}...", quelle est l'affirmation correcte concernant ${keyWord} ?`,
        explanation: `D'après le texte fourni : "${sentence}". La réponse exacte s'appuie directement sur le contenu du document.`,
        points: 100,
        options: [
          { text: `Il s'agit d'un élément clé défini dans le document pour optimiser le processus.`, isCorrect: true },
          { text: `Cette notion est formellement déconseillée selon le support.`, isCorrect: false },
          { text: `Le document indique que ce composant est obsolète et ignoré.`, isCorrect: false },
          { text: `Ce terme n'a aucun impact sur les résultats présentés.`, isCorrect: false }
        ]
      });
    }
  }

  // Pre-configured rich domain templates if pool is smaller than count
  const domainKnowledge = {
    sql: [
      {
        questionText: "Quelle clause SQL permet de filtrer les résultats d'une fonction d'agrégation telle que COUNT() ou AVG() ?",
        explanation: "La clause HAVING s'applique après l'agrégation (GROUP BY), tandis que WHERE filtre les lignes individuelles avant l'agrégation.",
        points: 100,
        options: [
          { text: "HAVING", isCorrect: true },
          { text: "WHERE", isCorrect: false },
          { text: "ORDER BY", isCorrect: false },
          { text: "FILTER", isCorrect: false }
        ]
      },
      {
        questionText: "Quel type de jointure retourne tous les enregistrements de la table de gauche, même sans correspondance dans la table de droite ?",
        explanation: "LEFT JOIN (ou LEFT OUTER JOIN) renvoie toutes les lignes de la table de gauche et les valeurs correspondantes de la table de droite ou NULL.",
        points: 100,
        options: [
          { text: "LEFT JOIN", isCorrect: true },
          { text: "INNER JOIN", isCorrect: false },
          { text: "RIGHT JOIN", isCorrect: false },
          { text: "CROSS JOIN", isCorrect: false }
        ]
      },
      {
        questionText: "Que garantit la propriété 'Atomicity' (Atomicité) dans le modèle ACID d'une base de données ?",
        explanation: "L'atomicité garantit qu'une transaction s'exécute intégralement ou pas du tout (tout ou rien).",
        points: 100,
        options: [
          { text: "La transaction est exécutée en totalité ou annulée complètement (tout ou rien)", isCorrect: true },
          { text: "Les données sont répliquées sur au moins deux disques distincts", isCorrect: false },
          { text: "Les requêtes de lecture ne bloquent jamais les écritures", isCorrect: false },
          { text: "Les clés primaires sont automatiquement chiffrées", isCorrect: false }
        ]
      },
      {
        questionText: "Quelle commande DDL permet de supprimer une table et sa structure de manière irréversible ?",
        explanation: "DROP TABLE supprime définitivement la table et son schéma. TRUNCATE vide le contenu, et DELETE supprime les lignes avec journalisation.",
        points: 100,
        options: [
          { text: "DROP TABLE", isCorrect: true },
          { text: "TRUNCATE TABLE", isCorrect: false },
          { text: "DELETE FROM", isCorrect: false },
          { text: "REMOVE TABLE", isCorrect: false }
        ]
      },
      {
        questionText: "Pourquoi utilise-t-on des requêtes préparées (Prepared Statements) en backend avec MySQL ?",
        explanation: "Les requêtes préparées séparent le code SQL des données utilisateur, ce qui neutralise complètement les failles d'injection SQL.",
        points: 100,
        options: [
          { text: "Pour prévenir et neutraliser les attaques par injection SQL", isCorrect: true },
          { text: "Pour doubler la capacité de stockage des disques", isCorrect: false },
          { text: "Pour convertir automatiquement les résultats en XML", isCorrect: false },
          { text: "Pour forcer le protocole HTTPS sur le serveur", isCorrect: false }
        ]
      }
    ],
    javascript: [
      {
        questionText: "En JavaScript, quelle est la différence majeure entre 'let' et 'var' concernant la portée (scope) ?",
        explanation: "'let' a une portée de bloc (block scope, entre accolades {}), alors que 'var' a une portée de fonction (function scope) et subit le hoisting.",
        points: 100,
        options: [
          { text: "'let' a une portée de bloc tandis que 'var' a une portée de fonction", isCorrect: true },
          { text: "'let' ne peut stocker que des nombres et 'var' des chaînes", isCorrect: false },
          { text: "'var' est immuable tandis que 'let' est réassignable", isCorrect: false },
          { text: "Il n'y a aucune différence technique, ce sont des synonymes", isCorrect: false }
        ]
      },
      {
        questionText: "Quelle méthode JavaScript permet de transformer un tableau en un nouvel élément sans modifier le tableau original ?",
        explanation: "Array.prototype.map() crée un nouveau tableau avec les résultats de l'appel d'une fonction fournie sur chaque élément.",
        points: 100,
        options: [
          { text: "map()", isCorrect: true },
          { text: "splice()", isCorrect: false },
          { text: "push()", isCorrect: false },
          { text: "pop()", isCorrect: false }
        ]
      },
      {
        questionText: "Que retourne l'expression 'typeof NaN' en JavaScript ?",
        explanation: "En JavaScript, NaN signifie 'Not-a-Number', mais son type primitif sous-jacent est 'number'.",
        points: 100,
        options: [
          { text: "'number'", isCorrect: true },
          { text: "'nan'", isCorrect: false },
          { text: "'undefined'", isCorrect: false },
          { text: "'object'", isCorrect: false }
        ]
      },
      {
        questionText: "Quel est le rôle de la boucle d'événements (Event Loop) dans Node.js ?",
        explanation: "L'Event Loop permet à Node.js d'effectuer des opérations d'E/S non bloquantes bien que JavaScript soit exécuté sur un seul thread.",
        points: 100,
        options: [
          { text: "Ordonnancer les callbacks asynchrones sur un thread unique sans bloquer", isCorrect: true },
          { text: "Créer un thread système séparé pour chaque requête HTTP entrante", isCorrect: false },
          { text: "Compiler le code source en binaire machine avant exécution", isCorrect: false },
          { text: "Gérer la connexion physique au réseau Ethernet", isCorrect: false }
        ]
      },
      {
        questionText: "Dans une Promise JavaScript, quelle méthode est invoquée lorsque l'opération échoue ?",
        explanation: "La méthode .catch() intercepte les rejets de promesse et les erreurs lancées dans la chaîne asynchrone.",
        points: 100,
        options: [
          { text: ".catch()", isCorrect: true },
          { text: ".then()", isCorrect: false },
          { text: ".finally()", isCorrect: false },
          { text: ".fail()", isCorrect: false }
        ]
      }
    ],
    default: [
      {
        questionText: `[${theme}] - Question clé 1 : Quel est le principe fondamental associé à "${theme}" ?`,
        explanation: `Le principe central repose sur la rigueur méthodologique et la séparation des responsabilités.`,
        points: 100,
        options: [
          { text: "L'organisation modulaire, l'isolation et la conformité aux spécifications", isCorrect: true },
          { text: "L'absence de structure et l'exécution aléatoire des tâches", isCorrect: false },
          { text: "La centralisation rigide sans possibilité de délégation", isCorrect: false },
          { text: "L'omission des tests de validation et de sécurité", isCorrect: false }
        ]
      },
      {
        questionText: `[${theme}] - Question 2 : Dans le cadre du niveau ${difficulty}, quel facteur assure la meilleure fiabilité ?`,
        explanation: `L'automatisation des vérifications et la surveillance en continu garantissent une détection proactive des anomalies.`,
        points: 100,
        options: [
          { text: "La validation systématique des entrées et la surveillance continue", isCorrect: true },
          { text: "L'ignorance délibérée des messages d'erreur et avertissements", isCorrect: false },
          { text: "La surcharge des ressources sans contrôle de capacité", isCorrect: false },
          { text: "La désactivation de tous les protocoles de chiffrement", isCorrect: false }
        ]
      },
      {
        questionText: `[${theme}] - Question 3 : Quelle méthode est recommandée pour évaluer la performance dans ce contexte ?`,
        explanation: `L'analyse d'indicateurs métriques mesurables (KPIs, temps de réponse, taux d'exactitude).`,
        points: 100,
        options: [
          { text: "L'analyse quantitative d'indicateurs de performance et de fidélité", isCorrect: true },
          { text: "Une estimation purement intuitive sans aucune donnée factuelle", isCorrect: false },
          { text: "L'interruption brutale de l'ensemble des processus périodiques", isCorrect: false },
          { text: "La suppression de l'historique d'audit et des journaux d'activité", isCorrect: false }
        ]
      },
      {
        questionText: `[${theme}] - Question 4 : En situation d'examen sécurisé, pourquoi la surveillance continue est-elle critique ?`,
        explanation: `Elle permet d'authentifier l'apprenant, d'assurer l'équité des chances et d'éviter les fraudes externes.`,
        points: 100,
        options: [
          { text: "Garantir l'intégrité de l'évaluation et l'équité entre tous les apprenants", isCorrect: true },
          { text: "Accélérer artificiellement la vitesse de connexion internet", isCorrect: false },
          { text: "Remplacer l'évaluation des connaissances par un tirage au sort", isCorrect: false },
          { text: "Afficher des publicités ciblées pendant l'épreuve", isCorrect: false }
        ]
      },
      {
        questionText: `[${theme}] - Question 5 : Quelle conclusion tirer de l'apprentissage de ce module ?`,
        explanation: `La maîtrise des concepts théoriques couplée à la mise en pratique immédiate favorise la rétention à long terme.`,
        points: 100,
        options: [
          { text: "L'application pratique et la rétroaction continue consolident les acquis", isCorrect: true },
          { text: "La mémorisation superficielle sans compréhension suffit amplement", isCorrect: false },
          { text: "Aucun travail régulier n'est nécessaire pour maîtriser le sujet", isCorrect: false },
          { text: "Les outils collaboratifs nuisent à l'assimilation des connaissances", isCorrect: false }
        ]
      }
    ]
  };

  let chosenSet = domainKnowledge.default;
  if (normalizedTheme.includes('sql') || normalizedTheme.includes('base de') || normalizedTheme.includes('database')) {
    chosenSet = domainKnowledge.sql;
  } else if (normalizedTheme.includes('js') || normalizedTheme.includes('javascript') || normalizedTheme.includes('node') || normalizedTheme.includes('web')) {
    chosenSet = domainKnowledge.javascript;
  }

  // Combine extracted document questions if any with domain questions
  const finalQuestions = [...pool, ...chosenSet].slice(0, count);
  return finalQuestions;
}

/**
 * Main AI Generation Function
 */
async function generateQuizWithAI({ theme, difficulty = 'Intermédiaire', textContent = '', count = 5 }) {
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `
Vous êtes un expert pédagogique universitaire. Générez un QCM de ${count} questions de niveau "${difficulty}" sur le thème "${theme}".
${textContent ? `Basé sur le contenu suivant : """${textContent.substring(0, 4000)}"""` : ''}

Consignes strictes :
1. Chaque question doit avoir exactement 4 propositions de réponse.
2. Une seule proposition doit être correcte (isCorrect: true), les 3 autres fausses (isCorrect: false).
3. Fournissez une explication pédagogique détaillée (champ "explanation") expliquant pourquoi la bonne réponse est correcte et la faute fréquente évitée.
4. Répondez STRICTEMENT en format JSON valide, sans balises markdown, ni texte avant ou après.
Format attendu :
[
  {
    "questionText": "Énoncé clair de la question",
    "explanation": "Explication pédagogique de la réponse",
    "points": 100,
    "options": [
      { "text": "Proposition A", "isCorrect": true },
      { "text": "Proposition B", "isCorrect": false },
      { "text": "Proposition C", "isCorrect": false },
      { "text": "Proposition D", "isCorrect": false }
    ]
  }
]
`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Clean JSON if backticks are present
      const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.warn('Gemini API call failed or quota reached, falling back to built-in generator:', err.message);
    }
  }

  // Fallback to intelligent local generator
  return generateFallbackQuestions(theme, difficulty, textContent, count);
}

/**
 * Generate post-exam personalized feedback
 */
async function generatePersonalizedFeedback({ studentName, examTitle, score, totalQuestions, correctCount, tabSwitches, suspiciousAlerts, missedTopics = [] }) {
  const percentage = Math.round((correctCount / (totalQuestions || 1)) * 100);
  
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `
L'étudiant(e) ${studentName} vient de terminer l'examen "${examTitle}".
Résultats :
- Score : ${percentage}% (${correctCount}/${totalQuestions} réponses correctes).
- Avertissements anti-triche : ${tabSwitches} changements d'onglets, ${suspiciousAlerts} alertes proctoring.
${missedTopics.length > 0 ? `- Sujets des questions échouées : ${missedTopics.join(', ')}` : ''}

Rédigez un feedback pédagogique personnalisé, bienveillant mais professionnel (en 3 à 5 phrases) :
1. Saluez la performance selon son résultat.
2. Donnez un conseil d'amélioration ciblé sur les points faibles.
3. Si des alertes de surveillance ou de changement d'onglet existent, rappelez poliment l'importance des règles de sécurité et de concentration.
`;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err) {
      console.warn('Gemini feedback failed, using smart local template:', err.message);
    }
  }

  // Local pedagogic template
  let message = `Bravo ${studentName} pour avoir complété l'épreuve "${examTitle}" ! `;
  if (percentage >= 80) {
    message += `Excellente maîtrise du sujet avec un score remarquable de ${percentage}%. Vos connaissances sont solides et approfondies. `;
  } else if (percentage >= 50) {
    message += `Résultat encourageant de ${percentage}%. Les fondamentaux sont acquis, mais une révision des questions manquées vous permettra d'atteindre l'excellence. `;
  } else {
    message += `Score obtenu : ${percentage}%. Nous vous recommandons de revoir attentivement les notions abordées lors de cette session pour combler les lacunes identifiées. `;
  }

  if (tabSwitches > 0 || suspiciousAlerts > 0) {
    message += `Note de surveillance : ${tabSwitches} changement(s) de fenêtre et ${suspiciousAlerts} alerte(s) webcam ont été enregistrés durant votre session. Veillez à maintenir une concentration continue lors des prochaines évaluations sécurisées.`;
  }

  return message;
}

module.exports = {
  extractTextFromPDF,
  generateQuizWithAI,
  generatePersonalizedFeedback
};
