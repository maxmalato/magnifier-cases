// Schemas dos dados do jogo (níveis e tema). O schema é a fonte única: os tipos saem dele
// (z.infer). Dado inválido nunca chega ao motor. Nenhum valor de nível fica no código: os
// valores (inicial) vivem em data/difficulties.json e no tema (packages/content).
import { z } from 'zod'

export const levelIds = ['apprentice', 'investigator', 'expert', 'legend'] as const
export const LevelIdSchema = z.enum(levelIds)
export type LevelId = z.infer<typeof LevelIdSchema>

export const clueEffectKinds = [
  'exclude-suspects',
  'exclude-places',
  'only-suspects',
  'only-places',
  'none',
] as const
export const ClueEffectKindSchema = z.enum(clueEffectKinds)
export type ClueEffectKind = z.infer<typeof ClueEffectKindSchema>

/** Ponto de partida da equipe: não tem carta e não pode ser esconderijo. */
export const START_PLACE_ID = 'square'

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'use letras minúsculas, números e hífens')
const rate = z.number().min(0).max(1)
const range = (min: number) =>
  z
    .object({ min: z.int().min(min), max: z.int().min(min) })
    .refine((r) => r.min <= r.max, 'min maior que max')

/** "18:00" → minutos desde a meia-noite. */
export function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export const DifficultyParamsSchema = z
  .object({
    id: LevelIdSchema,
    suspectCount: z.int().min(2),
    placeCount: z.int().min(2),
    /** Ações do nível; o início do relógio é derivado (deadline − ações × minutos). */
    actionsTotal: z.int().min(1),
    actionMinutes: z.int().min(1),
    deadline: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'use HH:MM'),
    wrongAccusationCost: z.int().min(1),
    /** Taxa de cartas de ruído (sem efeito). */
    noiseRate: rate,
    /** Tamanho do grupo nas cartas exclude-*. */
    excludeGroupSize: range(1),
    /** Taxa de cartas only-* (pistas parciais). */
    includeRate: rate,
    /** Tamanho do grupo nas cartas only-* (nunca 1). */
    includeGroupSize: range(2),
    /** Taxa de cartas (não ruído) que falam de lugares; o resto fala de suspeitos. */
    placeTargetRate: rate,
    minSlack: z.int().min(0),
    suggestEnabled: z.boolean(),
    /** Tentativas do gerador antes de desistir (MysteryGenerationError). */
    maxAttempts: z.int().min(1),
  })
  .refine((p) => p.noiseRate + p.includeRate <= 1, 'noiseRate + includeRate passa de 1')
  .refine(
    (p) => p.actionsTotal * p.actionMinutes <= minutesOf(p.deadline),
    'o relógio começaria antes da meia-noite',
  )
export type DifficultyParams = z.infer<typeof DifficultyParamsSchema>

export const DifficultiesSchema = z
  .array(DifficultyParamsSchema)
  .refine(
    (list) =>
      list.length === levelIds.length && levelIds.every((id) => list.some((p) => p.id === id)),
    'precisa de exatamente um item por nível',
  )

const CastItemSchema = z.object({
  id: slug,
  /** Chave i18n do nome (packages/content). */
  nameKey: z.string().min(1),
  /** Gênero gramatical, para os formatadores de concordância. */
  gender: z.enum(['m', 'f']),
})
export type CastItem = z.infer<typeof CastItemSchema>

export const ClueTemplateSchema = z.object({
  id: slug,
  effectKind: ClueEffectKindSchema,
  sourceType: z.enum(['place', 'suspect', 'both']),
  /** Chave i18n do texto, com marcadores {suspects}, {places} e {source}. */
  textKey: z.string().min(1),
  weight: z.number().positive(),
})
export type ClueTemplate = z.infer<typeof ClueTemplateSchema>

export const ThemePackSchema = z
  .object({
    id: slug,
    startPlaceId: z.literal(START_PLACE_ID),
    suspects: z.array(CastItemSchema).min(2),
    places: z.array(CastItemSchema).min(2),
    templates: z.array(ClueTemplateSchema).min(1),
  })
  .superRefine((theme, ctx) => {
    const ids = [...theme.suspects, ...theme.places].map((i) => i.id)
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: 'custom', message: 'ids repetidos no elenco' })
    if (theme.places.some((p) => p.id === START_PLACE_ID))
      ctx.addIssue({ code: 'custom', message: 'a Praça não pode ser um lugar do elenco' })
    const templateIds = theme.templates.map((t) => t.id)
    if (new Set(templateIds).size !== templateIds.length)
      ctx.addIssue({ code: 'custom', message: 'ids de modelo repetidos' })
    // todo tipo de efeito precisa de um modelo para cada origem (lugar e suspeito)
    for (const kind of clueEffectKinds) {
      for (const source of ['place', 'suspect'] as const) {
        const ok = theme.templates.some(
          (t) => t.effectKind === kind && (t.sourceType === source || t.sourceType === 'both'),
        )
        if (!ok)
          ctx.addIssue({ code: 'custom', message: `falta modelo de ${kind} para origem ${source}` })
      }
    }
  })
export type ThemePack = z.infer<typeof ThemePackSchema>

/** Valida os níveis; lança um erro legível se o arquivo estiver errado. */
export function parseDifficulties(raw: unknown): readonly DifficultyParams[] {
  return DifficultiesSchema.parse(raw)
}

/** Valida um tema; lança um erro legível se estiver errado. */
export function parseThemePack(raw: unknown): ThemePack {
  return ThemePackSchema.parse(raw)
}
