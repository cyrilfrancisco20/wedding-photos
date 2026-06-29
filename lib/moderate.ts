import Anthropic from '@anthropic-ai/sdk'

// Statut écrit dans la table photos. 'pending' = file de revue humaine /moderateur.
export type ModerationResult = {
  status: 'approved' | 'rejected' | 'pending'
  reason: string
}

// L'API vision de Claude n'accepte que ces formats. HEIC/HEIF (iPhone) ne sont
// pas analysables -> revue humaine plutôt qu'auto-approbation.
const VISION_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// Lazy : si ANTHROPIC_API_KEY manque, l'erreur tombe dans le try/catch (=> pending),
// et ne casse pas le chargement de la route.
let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic() // lit ANTHROPIC_API_KEY dans l'environnement
  return _client
}

const SYSTEM = `Tu es modérateur d'une galerie privée de mariage. Les invités envoient des photos de la soirée. Laisse passer les photos normales, bloque uniquement le contenu inapproprié.

BLOQUER (decision "rejected") :
- Nudité ou contenu sexuel explicite
- Violence graphique, sang, gore
- Symboles ou contenus haineux ou racistes (ex : croix gammée)
- Consommation de drogues dures

LAISSER PASSER (decision "approved") :
- Toute photo de fête normale : invités, danse, repas, baisers, alcool (vin, champagne), décor, paysage, selfies, enfants habillés.

INCERTAIN (decision "pending") :
- Seulement si l'image est vraiment ambiguë. Ne bloque jamais par excès de prudence une photo de fête banale.

"reason" : une phrase courte en français.`

const SCHEMA = {
  type: 'object',
  properties: {
    decision: { type: 'string', enum: ['approved', 'rejected', 'pending'] },
    reason: { type: 'string' },
  },
  required: ['decision', 'reason'],
  additionalProperties: false,
} as const

export async function moderatePhoto(
  base64: string,
  mediaType: string,
): Promise<ModerationResult> {
  if (!VISION_TYPES.includes(mediaType)) {
    return { status: 'pending', reason: `Format ${mediaType} non analysable, revue manuelle.` }
  }

  try {
    const response = await getClient().messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      system: SYSTEM,
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType as 'image/jpeg', data: base64 },
            },
            { type: 'text', text: 'Analyse cette photo et décide : approved, rejected ou pending.' },
          ],
        },
      ],
    })

    // Fail-safe : tout refus de sécurité de l'API => revue humaine, jamais d'auto-approbation.
    if (response.stop_reason === 'refusal') {
      return { status: 'pending', reason: 'Image signalée par la sécurité de l\'API, revue manuelle.' }
    }

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return { status: 'pending', reason: 'Réponse de modération illisible, revue manuelle.' }
    }

    const parsed = JSON.parse(textBlock.text) as { decision: string; reason: string }
    const status =
      parsed.decision === 'approved' || parsed.decision === 'rejected'
        ? parsed.decision
        : 'pending'
    return { status, reason: parsed.reason ?? '' }
  } catch (e) {
    // Clé invalide, timeout, JSON cassé : on ne laisse jamais passer sans contrôle humain.
    return {
      status: 'pending',
      reason: `Modération auto indisponible, revue manuelle. (${e instanceof Error ? e.message : 'erreur'})`,
    }
  }
}
