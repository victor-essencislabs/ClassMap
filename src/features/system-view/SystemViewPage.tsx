// TASK-004 (lógica) / TASK-009 (layout do artefato, ADR-002): Visão do
// Sistema — navegação por módulo→entidade na lateral (`.ov-nav`) e
// detalhe da entidade (`.ov-detail`) com breadcrumb, pills de resumo,
// tabela de campos com badges de restrição, métodos de API e regras de
// permissão, igual ao artefato-protótipo. Full-bleed com topbar própria
// (mesmo padrão visual de `DiagramEditorPage`/`ObjectDiagramPage`, sem
// `AppLayout`) — só não usa `DiagramShell`/canvas/inspector porque esta
// tela não é um canvas (ver decisão na TASK-009).
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Modal } from '../diagram-shell/Modal'
import { ThemeToggle } from '../theme/ThemeToggle'
import {
  getCurrentUserId,
  getDiagram,
  getMyProjectRole,
  renameDiagram,
  updateDiagramContent,
} from '../../lib/supabase/queries'
import type { Diagram, ProjectRole } from '../../lib/supabase/types'
import * as ops from './contentOperations'
import {
  emptySystemViewContent,
  isSystemViewContent,
  type SystemViewContent,
  type SystemViewEntity,
  type SystemViewField,
  type SystemViewModule,
} from './types'

const AUTOSAVE_DELAY_MS = 800

/** Os 5 booleanos de restrição do campo, na ordem exibida como badges —
 * `variant` vazio usa o estilo neutro genérico de `.ov-flag` (o artefato
 * só definiu cor própria para PK/FK/NN; AI/UQ não têm equivalente lá,
 * mas não podem ser perdidos — CA-02). */
const FIELD_FLAGS: {
  key: keyof Pick<SystemViewField, 'isPrimaryKey' | 'isForeignKey' | 'isRequired' | 'isAutoIncrement' | 'isUnique'>
  label: string
  variant: string
  title: string
}[] = [
  { key: 'isPrimaryKey', label: 'PK', variant: 'pk', title: 'Chave primária' },
  { key: 'isForeignKey', label: 'FK', variant: 'fk', title: 'Chave estrangeira' },
  { key: 'isRequired', label: 'NN', variant: 'nn', title: 'Obrigatório (not null)' },
  { key: 'isAutoIncrement', label: 'AI', variant: '', title: 'Auto-incremento' },
  { key: 'isUnique', label: 'UQ', variant: '', title: 'Único' },
]

function flagClassName(active: boolean, variant: string): string {
  if (!active) return 'ov-flag'
  return variant ? `ov-flag ${variant}` : 'ov-flag active'
}

export function SystemViewPage() {
  const { orgId, projectId, diagramId } = useParams<{
    orgId: string
    projectId: string
    diagramId: string
  }>()
  const [diagram, setDiagram] = useState<Diagram | null>(null)
  const [content, setContent] = useState<SystemViewContent | null>(null)
  const [role, setRole] = useState<ProjectRole | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null)
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  // TASK-018: "+ Módulo" pergunta o nome antes de criar (mesmo padrão do
  // modal de nome de diagrama, TASK-016) — campo vazio cai no padrão
  // "Novo módulo" (`ops.addModule`).
  const [creatingModule, setCreatingModule] = useState(false)
  const [moduleNameInput, setModuleNameInput] = useState('')
  // TASK-020: nome do diagrama editável na topbar — mesmo padrão de
  // `DiagramEditorPage`/`ObjectDiagramPage`.
  const [nameInput, setNameInput] = useState('')
  const nameSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  // TASK-021: módulo aguardando confirmação de exclusão (`removeModule`
  // já existia em `contentOperations.ts` desde a TASK-004, sem nenhum
  // componente chamando).
  const [deletingModule, setDeletingModule] = useState<SystemViewModule | null>(null)
  // TASK-024: mesma situação de `removeModule` antes da TASK-021 —
  // `removeEntity` já existia em `contentOperations.ts` desde a TASK-004,
  // sem nenhum componente chamando. Guarda também `moduleId`, já que
  // `removeEntity(content, moduleId, entityId)` precisa dos dois.
  const [deletingEntity, setDeletingEntity] = useState<{ moduleId: string; entity: SystemViewEntity } | null>(null)

  useEffect(() => {
    if (!diagramId || !projectId) return
    Promise.all([getDiagram(diagramId), getCurrentUserId()])
      .then(([loadedDiagram, userId]) => {
        setDiagram(loadedDiagram)
        setNameInput(loadedDiagram.name)
        setContent(isSystemViewContent(loadedDiagram.content) ? loadedDiagram.content : emptySystemViewContent())
        return userId ? getMyProjectRole(projectId, userId) : null
      })
      .then(setRole)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar diagrama.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagramId, projectId])

  function handleChange(next: SystemViewContent) {
    setContent(next)
    if (!diagramId) return
    setSaveState('saving')
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      updateDiagramContent(diagramId, next as unknown as Record<string, unknown>)
        .then(() => setSaveState('saved'))
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Erro ao salvar diagrama.')
          setSaveState('error')
        })
    }, AUTOSAVE_DELAY_MS)
  }

  function openCreateModuleModal() {
    setModuleNameInput('')
    setCreatingModule(true)
  }

  function handleAddModule(name: string) {
    if (!content) return
    handleChange(ops.addModule(content, name))
    setCreatingModule(false)
  }

  // TASK-021: confirmar exclusão remove o módulo e, se a entidade
  // selecionada pertencia a ele, limpa a seleção (CA-03) para não deixar
  // `ov-detail` apontando para uma entidade que não existe mais.
  function handleConfirmDeleteModule() {
    if (!content || !deletingModule) return
    handleChange(ops.removeModule(content, deletingModule.id))
    if (selectedModuleId === deletingModule.id) {
      setSelectedModuleId(null)
      setSelectedEntityId(null)
    }
    setDeletingModule(null)
  }

  // TASK-024: mesmo padrão de `handleConfirmDeleteModule` — confirmar
  // remove a entidade e, se era a selecionada, limpa a seleção (CA-03)
  // para o painel de detalhe voltar ao estado vazio em vez de continuar
  // apontando para uma entidade que não existe mais.
  function handleConfirmDeleteEntity() {
    if (!content || !deletingEntity) return
    handleChange(ops.removeEntity(content, deletingEntity.moduleId, deletingEntity.entity.id))
    if (selectedEntityId === deletingEntity.entity.id) {
      setSelectedEntityId(null)
    }
    setDeletingEntity(null)
  }

  // TASK-020: campo vazio/só espaços nunca é persistido (RN-01) — o blur
  // (handleNameBlur) devolve o nome anterior nesse caso.
  function handleNameChange(value: string) {
    setNameInput(value)
    if (!diagramId) return
    if (nameSaveTimeout.current) clearTimeout(nameSaveTimeout.current)
    const trimmed = value.trim()
    if (!trimmed) return
    setSaveState('saving')
    nameSaveTimeout.current = setTimeout(() => {
      renameDiagram(diagramId, trimmed)
        .then(() => {
          setDiagram((prev) => (prev ? { ...prev, name: trimmed } : prev))
          setSaveState('saved')
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Erro ao renomear diagrama.')
          setSaveState('error')
        })
    }, AUTOSAVE_DELAY_MS)
  }

  function handleNameBlur() {
    if (!nameInput.trim()) setNameInput(diagram?.name ?? '')
  }

  if (error) return <p className="error">{error}</p>
  if (!diagram || !content) return <p>Carregando…</p>

  const readOnly = role !== 'editor'
  const selectedModule = content.modules.find((m) => m.id === selectedModuleId)
  const selectedEntity = selectedModule?.entities.find((e) => e.id === selectedEntityId)

  return (
    <div className="system-view-shell">
      <div className="diagram-shell-topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">ClassMap</span>
        </div>
        <span className="divider-v" aria-hidden="true" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden' }}>
          <Link to={`/orgs/${orgId}/projects/${projectId}`} className="breadcrumb" style={{ margin: 0 }}>
            ← Diagramas
          </Link>
          {readOnly ? (
            <strong style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {diagram.name}
            </strong>
          ) : (
            <input
              className="diagram-name-input"
              aria-label="Nome do diagrama"
              value={nameInput}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              }}
            />
          )}
          {/* TASK-038 (ADR-011) — "seal-confirm" só entra na transição real
              para `saved` (RN-01); nunca ao reabrir um diagrama já salvo. */}
          {!readOnly && (
            <span className={saveState === 'saved' ? 'save-indicator seal-confirm' : 'save-indicator'}>
              {saveIndicatorLabel(saveState)}
            </span>
          )}
        </div>
        <div className="topbar-actions">
          {!readOnly && (
            <button type="button" className="btn primary" onClick={openCreateModuleModal}>
              + Módulo
            </button>
          )}
        </div>
        {/* TASK-019 (ADR-007): fora do `topbar-actions` de propósito —
            fica visível também em modo `visualizador`, que não vê "+
            Módulo". */}
        <ThemeToggle />
      </div>

      <div className="ov-body">
        <nav className="ov-nav">
          {content.modules.map((module) => (
            <div key={module.id} className="ov-module">
              {readOnly ? (
                <div className="ov-module-title">{module.name}</div>
              ) : (
                <div className="ov-module-title-row">
                  <input
                    className="ov-module-title-input"
                    aria-label="Nome do módulo"
                    value={module.name}
                    onChange={(e) => handleChange(ops.updateModule(content, module.id, { name: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="ov-row-remove"
                    aria-label={`Excluir módulo ${module.name}`}
                    title="Excluir módulo"
                    onClick={() => setDeletingModule(module)}
                  >
                    ×
                  </button>
                </div>
              )}
              {module.entities.map((entity) => (
                <button
                  key={entity.id}
                  type="button"
                  className={`ov-entity-btn${entity.id === selectedEntityId ? ' active' : ''}`}
                  onClick={() => {
                    setSelectedModuleId(module.id)
                    setSelectedEntityId(entity.id)
                  }}
                >
                  <span className="ov-entity-dot" aria-hidden="true" />
                  {entity.name}
                </button>
              ))}
              {!readOnly && (
                <button
                  type="button"
                  className="ov-nav-add"
                  onClick={() => handleChange(ops.addEntity(content, module.id))}
                >
                  + Entidade
                </button>
              )}
            </div>
          ))}
          {content.modules.length === 0 && <p className="ov-section-empty">Nenhum módulo cadastrado.</p>}
        </nav>

        <div className="ov-detail">
          {!selectedModule || !selectedEntity ? (
            <div className="ov-empty">Selecione uma entidade para ver seus detalhes.</div>
          ) : (
            <EntityDetail
              // TASK-035 (ADR-011) — remonta a cada troca de entidade para
              // repetir a animação `ov-detail-in` (raise da Folha
              // Miura-Ori: os 3 blocos aparecem juntos, nunca em cascata).
              key={selectedEntity.id}
              content={content}
              module={selectedModule}
              entity={selectedEntity}
              readOnly={readOnly}
              onChange={handleChange}
              onRequestDelete={(moduleId, entity) => setDeletingEntity({ moduleId, entity })}
            />
          )}
        </div>
      </div>

      {creatingModule && (
        <Modal title="Novo módulo" onClose={() => setCreatingModule(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleAddModule(moduleNameInput)
            }}
          >
            <div className="field">
              <label htmlFor="module-name-input">Nome do módulo</label>
              <input
                id="module-name-input"
                type="text"
                placeholder="ex.: Account, Company"
                value={moduleNameInput}
                onChange={(e) => setModuleNameInput(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button type="submit" className="btn primary">
                Criar módulo
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deletingModule && (
        <Modal title="Excluir módulo" onClose={() => setDeletingModule(null)}>
          <p className="error">
            Isto vai excluir o módulo <strong>{deletingModule.name}</strong>
            {deletingModule.entities.length > 0
              ? ` e as ${deletingModule.entities.length} entidade(s) dentro dele (com todos os campos, métodos de API e regras de permissão).`
              : '.'}{' '}
            Esta ação não pode ser desfeita.
          </p>
          <div className="modal-actions">
            <button type="button" className="btn danger" onClick={handleConfirmDeleteModule}>
              Excluir módulo
            </button>
            <button type="button" className="btn ghost" onClick={() => setDeletingModule(null)}>
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      {deletingEntity && (
        <Modal title="Excluir entidade" onClose={() => setDeletingEntity(null)}>
          <p className="error">
            Isto vai excluir a entidade <strong>{deletingEntity.entity.name}</strong>
            {describeEntityLoss(deletingEntity.entity)} Esta ação não pode ser desfeita.
          </p>
          <div className="modal-actions">
            <button type="button" className="btn danger" onClick={handleConfirmDeleteEntity}>
              Excluir entidade
            </button>
            <button type="button" className="btn ghost" onClick={() => setDeletingEntity(null)}>
              Cancelar
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

/** Mensagem de perda para o modal de exclusão de entidade (TASK-024) —
 * mesmo critério de risco da TASK-021 (removeModule): edição de conteúdo
 * de um único diagrama, não hard delete de linhas do banco, então não
 * exige digitar o nome, só avisa o que será perdido. */
function describeEntityLoss(entity: SystemViewEntity): string {
  const parts: string[] = []
  if (entity.fields.length > 0) parts.push(`${entity.fields.length} campo${entity.fields.length === 1 ? '' : 's'}`)
  if (entity.apiMethods.length > 0) {
    parts.push(`${entity.apiMethods.length} método${entity.apiMethods.length === 1 ? '' : 's'} de API`)
  }
  if (entity.permissionRules.length > 0) {
    parts.push(`${entity.permissionRules.length} regra${entity.permissionRules.length === 1 ? '' : 's'} de permissão`)
  }
  if (parts.length === 0) return '.'
  if (parts.length === 1) return ` e ${parts[0]}.`
  return ` e ${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}.`
}

function saveIndicatorLabel(state: 'idle' | 'saving' | 'saved' | 'error'): string {
  switch (state) {
    case 'saving':
      return 'Salvando…'
    case 'saved':
      return 'Salvo'
    case 'error':
      return 'Falha ao salvar'
    default:
      return ''
  }
}

function EntityDetail({
  content,
  module,
  entity,
  readOnly,
  onChange,
  onRequestDelete,
}: {
  content: SystemViewContent
  module: SystemViewModule
  entity: SystemViewEntity
  readOnly: boolean
  onChange: (content: SystemViewContent) => void
  onRequestDelete: (moduleId: string, entity: SystemViewEntity) => void
}) {
  const moduleId = module.id

  return (
    <>
      <div className="ov-header">
        <div className="ov-breadcrumb">{module.name}</div>
        {readOnly ? (
          <div className="ov-entity-name">{entity.name}</div>
        ) : (
          <div className="ov-entity-name-row">
            <input
              className="ov-entity-name-input"
              value={entity.name}
              onChange={(e) => onChange(ops.updateEntity(content, moduleId, entity.id, { name: e.target.value }))}
            />
            <button
              type="button"
              className="ov-row-remove"
              aria-label={`Excluir entidade ${entity.name}`}
              title="Excluir entidade"
              onClick={() => onRequestDelete(moduleId, entity)}
            >
              ×
            </button>
          </div>
        )}
        <div className="ov-summary-row">
          <span className="ov-pill">{entity.fields.length} campos</span>
          <span className="ov-pill">{entity.apiMethods.length} métodos de API</span>
          <span className="ov-pill">{entity.permissionRules.length} regras de permissão</span>
        </div>
      </div>

      {/* Os 3 blocos abaixo são sempre renderizados, mesmo vazios — RN-02. */}
      <section className="ov-section">
        <div className="ov-section-title">
          <span>Campos</span>
          <span className="count">Banco → Model → DTO → Front</span>
        </div>
        <div className="ov-table-wrap">
          <table className="ov-table">
            <thead>
              <tr>
                <th>Campo</th>
                <th>Tipo BD</th>
                <th>Restrições</th>
                <th>Model</th>
                <th>DTO</th>
                <th>Validação</th>
                <th>Frontend</th>
                {!readOnly && <th />}
              </tr>
            </thead>
            <tbody>
              {entity.fields.map((field) => (
                <tr key={field.id}>
                  {readOnly ? (
                    <>
                      <td className="fname">{field.dbColumn}</td>
                      <td>{field.dbType}</td>
                      <td>
                        <div className="ov-flags">
                          {FIELD_FLAGS.filter((f) => field[f.key]).map((f) => (
                            <span key={f.label} className={flagClassName(true, f.variant)} title={f.title}>
                              {f.label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{field.modelType}</td>
                      <td>{field.dtoType}</td>
                      <td>{field.validationRule}</td>
                      <td>{field.frontendType}</td>
                    </>
                  ) : (
                    <>
                      {(
                        [
                          ['dbColumn', 'Coluna'],
                          ['dbType', 'Tipo BD'],
                        ] as const
                      ).map(([key, label]) => (
                        <td key={key}>
                          <input
                            aria-label={label}
                            value={field[key]}
                            onChange={(e) =>
                              onChange(
                                ops.updateField(content, moduleId, entity.id, field.id, { [key]: e.target.value }),
                              )
                            }
                          />
                        </td>
                      ))}
                      <td>
                        <div className="ov-flags">
                          {FIELD_FLAGS.map((f) => (
                            <button
                              key={f.label}
                              type="button"
                              className={flagClassName(field[f.key], f.variant)}
                              title={f.title}
                              onClick={() =>
                                onChange(
                                  ops.updateField(content, moduleId, entity.id, field.id, {
                                    [f.key]: !field[f.key],
                                  }),
                                )
                              }
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </td>
                      {(
                        [
                          ['modelType', 'Tipo model'],
                          ['dtoType', 'Tipo DTO'],
                          ['validationRule', 'Validação'],
                          ['frontendType', 'Tipo frontend'],
                        ] as const
                      ).map(([key, label]) => (
                        <td key={key}>
                          <input
                            aria-label={label}
                            value={field[key]}
                            onChange={(e) =>
                              onChange(
                                ops.updateField(content, moduleId, entity.id, field.id, { [key]: e.target.value }),
                              )
                            }
                          />
                        </td>
                      ))}
                      <td>
                        <button
                          type="button"
                          className="ov-row-remove"
                          onClick={() => onChange(ops.removeField(content, moduleId, entity.id, field.id))}
                        >
                          ×
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {entity.fields.length === 0 && <p className="ov-section-empty">Nenhum campo cadastrado.</p>}
        {!readOnly && (
          <button
            type="button"
            className="ov-nav-add"
            onClick={() => onChange(ops.addField(content, moduleId, entity.id))}
          >
            + Campo
          </button>
        )}
      </section>

      <section className="ov-section">
        <div className="ov-section-title">
          <span>Métodos de API</span>
          <span className="count">Controller · Service · Repository</span>
        </div>
        <div className="ov-table-wrap">
          {entity.apiMethods.map((method) => (
            <div key={method.id} className="ov-method-row">
              <div className="ov-method-body">
                <div className="ov-method-line">
                  {readOnly ? (
                    <>
                      {method.controller}
                      {method.permissionCode && <span className="ov-perm-badge">{method.permissionCode}</span>}
                    </>
                  ) : (
                    <>
                      <input
                        aria-label="Controller"
                        placeholder="Controller"
                        value={method.controller}
                        onChange={(e) =>
                          onChange(
                            ops.updateApiMethod(content, moduleId, entity.id, method.id, {
                              controller: e.target.value,
                            }),
                          )
                        }
                      />
                      <input
                        aria-label="Código de permissão"
                        placeholder="Código de permissão"
                        style={{ flex: '0 0 40%' }}
                        value={method.permissionCode ?? ''}
                        onChange={(e) =>
                          onChange(
                            ops.updateApiMethod(content, moduleId, entity.id, method.id, {
                              permissionCode: e.target.value || undefined,
                            }),
                          )
                        }
                      />
                    </>
                  )}
                </div>
                {(!readOnly || method.service) && (
                  <div className="ov-method-sub">
                    <span className="ov-method-sub-label">service</span>
                    {readOnly ? (
                      method.service
                    ) : (
                      <input
                        aria-label="Service"
                        value={method.service}
                        onChange={(e) =>
                          onChange(
                            ops.updateApiMethod(content, moduleId, entity.id, method.id, { service: e.target.value }),
                          )
                        }
                      />
                    )}
                  </div>
                )}
                {(!readOnly || method.repository) && (
                  <div className="ov-method-sub">
                    <span className="ov-method-sub-label">repo</span>
                    {readOnly ? (
                      method.repository
                    ) : (
                      <input
                        aria-label="Repository"
                        value={method.repository}
                        onChange={(e) =>
                          onChange(
                            ops.updateApiMethod(content, moduleId, entity.id, method.id, {
                              repository: e.target.value,
                            }),
                          )
                        }
                      />
                    )}
                  </div>
                )}
              </div>
              {!readOnly && (
                <button
                  type="button"
                  className="ov-row-remove"
                  onClick={() => onChange(ops.removeApiMethod(content, moduleId, entity.id, method.id))}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        {entity.apiMethods.length === 0 && <p className="ov-section-empty">Nenhum método de API cadastrado.</p>}
        {!readOnly && (
          <button
            type="button"
            className="ov-nav-add"
            onClick={() => onChange(ops.addApiMethod(content, moduleId, entity.id))}
          >
            + Método
          </button>
        )}
      </section>

      <section className="ov-section">
        <div className="ov-section-title">Regras de Permissão</div>
        {entity.permissionRules.map((rule) => (
          <div key={rule.id} className="ov-perm-card">
            {!readOnly && (
              <button
                type="button"
                className="ov-row-remove ov-perm-remove"
                onClick={() => onChange(ops.removePermissionRule(content, moduleId, entity.id, rule.id))}
              >
                ×
              </button>
            )}
            {readOnly ? (
              <div className="ov-perm-title">{rule.description || 'Sem descrição'}</div>
            ) : (
              <input
                className="ov-perm-title-input"
                aria-label="Descrição"
                placeholder="Descrição"
                value={rule.description}
                onChange={(e) =>
                  onChange(
                    ops.updatePermissionRule(content, moduleId, entity.id, rule.id, { description: e.target.value }),
                  )
                }
              />
            )}
            {readOnly ? (
              rule.codeCondition && <div className="ov-perm-cond">{rule.codeCondition}</div>
            ) : (
              <input
                className="ov-perm-cond-input"
                aria-label="Condição de código"
                placeholder="Condição de código"
                value={rule.codeCondition}
                onChange={(e) =>
                  onChange(
                    ops.updatePermissionRule(content, moduleId, entity.id, rule.id, {
                      codeCondition: e.target.value,
                    }),
                  )
                }
              />
            )}
          </div>
        ))}
        {entity.permissionRules.length === 0 && <p className="ov-section-empty">Nenhuma regra de permissão cadastrada.</p>}
        {!readOnly && (
          <button
            type="button"
            className="ov-nav-add"
            onClick={() => onChange(ops.addPermissionRule(content, moduleId, entity.id))}
          >
            + Regra
          </button>
        )}
      </section>
    </>
  )
}
