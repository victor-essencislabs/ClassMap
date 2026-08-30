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
import { getCurrentUserId, getDiagram, getMyProjectRole, updateDiagramContent } from '../../lib/supabase/queries'
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

  useEffect(() => {
    if (!diagramId || !projectId) return
    Promise.all([getDiagram(diagramId), getCurrentUserId()])
      .then(([loadedDiagram, userId]) => {
        setDiagram(loadedDiagram)
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
          <strong style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {diagram.name}
          </strong>
          {!readOnly && <span className="save-indicator">{saveIndicatorLabel(saveState)}</span>}
        </div>
        <div className="topbar-actions">
          {!readOnly && (
            <button type="button" className="btn primary" onClick={openCreateModuleModal}>
              + Módulo
            </button>
          )}
        </div>
      </div>

      <div className="ov-body">
        <nav className="ov-nav">
          {content.modules.map((module) => (
            <div key={module.id} className="ov-module">
              {readOnly ? (
                <div className="ov-module-title">{module.name}</div>
              ) : (
                <input
                  className="ov-module-title-input"
                  aria-label="Nome do módulo"
                  value={module.name}
                  onChange={(e) => handleChange(ops.updateModule(content, module.id, { name: e.target.value }))}
                />
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
              content={content}
              module={selectedModule}
              entity={selectedEntity}
              readOnly={readOnly}
              onChange={handleChange}
            />
          )}
        </div>
      </div>

      {creatingModule && (
        <Modal title="Novo módulo" onClose={() => setCreatingModule(false)}>
          <label htmlFor="module-name-input">Nome do módulo</label>
          <input
            id="module-name-input"
            type="text"
            placeholder="ex.: Account, Company"
            style={{ display: 'block', width: '100%', marginTop: 6 }}
            value={moduleNameInput}
            onChange={(e) => setModuleNameInput(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddModule(moduleNameInput)
            }}
          />
          <div className="modal-actions">
            <button type="button" className="btn primary" onClick={() => handleAddModule(moduleNameInput)}>
              Criar módulo
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
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
}: {
  content: SystemViewContent
  module: SystemViewModule
  entity: SystemViewEntity
  readOnly: boolean
  onChange: (content: SystemViewContent) => void
}) {
  const moduleId = module.id

  return (
    <>
      <div className="ov-header">
        <div className="ov-breadcrumb">{module.name}</div>
        {readOnly ? (
          <div className="ov-entity-name">{entity.name}</div>
        ) : (
          <input
            className="ov-entity-name-input"
            value={entity.name}
            onChange={(e) => onChange(ops.updateEntity(content, moduleId, entity.id, { name: e.target.value }))}
          />
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
