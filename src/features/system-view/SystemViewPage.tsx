import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCurrentUserId, getDiagram, getMyProjectRole, updateDiagramContent } from '../../lib/supabase/queries'
import type { Diagram, ProjectRole } from '../../lib/supabase/types'
import * as ops from './contentOperations'
import { emptySystemViewContent, isSystemViewContent, type SystemViewContent, type SystemViewEntity } from './types'

const AUTOSAVE_DELAY_MS = 800

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

  if (error) return <p className="error">{error}</p>
  if (!diagram || !content) return <p>Carregando…</p>

  const readOnly = role !== 'editor'
  const selectedModule = content.modules.find((m) => m.id === selectedModuleId)
  const selectedEntity = selectedModule?.entities.find((e) => e.id === selectedEntityId)

  return (
    <section className="system-view-page">
      <p>
        <Link to={`/orgs/${orgId}/projects/${projectId}`}>← Diagramas</Link>
      </p>
      <div className="diagram-editor-header">
        <h1>{diagram.name}</h1>
        {!readOnly && (
          <span className="save-indicator">
            {saveState === 'saving' ? 'Salvando…' : saveState === 'saved' ? 'Salvo' : saveState === 'error' ? 'Falha ao salvar' : ''}
          </span>
        )}
      </div>

      <div className="system-view-layout">
        <nav className="system-view-nav">
          {content.modules.map((module) => (
            <div key={module.id} className="system-view-module">
              <strong>{module.name}</strong>
              <ul>
                {module.entities.map((entity) => (
                  <li key={entity.id}>
                    <button
                      type="button"
                      className={entity.id === selectedEntityId ? 'nav-active' : ''}
                      onClick={() => {
                        setSelectedModuleId(module.id)
                        setSelectedEntityId(entity.id)
                      }}
                    >
                      {entity.name}
                    </button>
                  </li>
                ))}
                {!readOnly && (
                  <li>
                    <button type="button" onClick={() => handleChange(ops.addEntity(content, module.id))}>
                      + Entidade
                    </button>
                  </li>
                )}
              </ul>
            </div>
          ))}
          {!readOnly && (
            <button type="button" onClick={() => handleChange(ops.addModule(content))}>
              + Módulo
            </button>
          )}
        </nav>

        <div className="system-view-detail">
          {!selectedModule || !selectedEntity ? (
            <p>Selecione uma entidade para ver seus detalhes.</p>
          ) : (
            <EntityDetail
              content={content}
              moduleId={selectedModule.id}
              entity={selectedEntity}
              readOnly={readOnly}
              onChange={handleChange}
            />
          )}
        </div>
      </div>
    </section>
  )
}

function EntityDetail({
  content,
  moduleId,
  entity,
  readOnly,
  onChange,
}: {
  content: SystemViewContent
  moduleId: string
  entity: SystemViewEntity
  readOnly: boolean
  onChange: (content: SystemViewContent) => void
}) {
  return (
    <div>
      {readOnly ? (
        <h2>{entity.name}</h2>
      ) : (
        <input
          className="entity-name-input"
          value={entity.name}
          onChange={(e) => onChange(ops.updateEntity(content, moduleId, entity.id, { name: e.target.value }))}
        />
      )}

      {/* Os 3 blocos abaixo são sempre renderizados, mesmo vazios — RN-02. */}
      <section>
        <h3>Campos</h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Coluna</th>
                <th>Tipo DB</th>
                <th>PK</th>
                <th>FK</th>
                <th>Auto</th>
                <th>Obrig.</th>
                <th>Único</th>
                <th>Tipo model</th>
                <th>Tipo DTO</th>
                <th>Validação</th>
                <th>Tipo frontend</th>
                {!readOnly && <th />}
              </tr>
            </thead>
            <tbody>
              {entity.fields.map((field) => (
                <tr key={field.id}>
                  {readOnly ? (
                    <>
                      <td>{field.dbColumn}</td>
                      <td>{field.dbType}</td>
                      <td>{field.isPrimaryKey ? '✓' : ''}</td>
                      <td>{field.isForeignKey ? '✓' : ''}</td>
                      <td>{field.isAutoIncrement ? '✓' : ''}</td>
                      <td>{field.isRequired ? '✓' : ''}</td>
                      <td>{field.isUnique ? '✓' : ''}</td>
                      <td>{field.modelType}</td>
                      <td>{field.dtoType}</td>
                      <td>{field.validationRule}</td>
                      <td>{field.frontendType}</td>
                    </>
                  ) : (
                    <>
                      {(
                        [
                          ['dbColumn', 'text'],
                          ['dbType', 'text'],
                        ] as const
                      ).map(([key]) => (
                        <td key={key}>
                          <input
                            value={field[key]}
                            onChange={(e) =>
                              onChange(
                                ops.updateField(content, moduleId, entity.id, field.id, { [key]: e.target.value }),
                              )
                            }
                          />
                        </td>
                      ))}
                      {(['isPrimaryKey', 'isForeignKey', 'isAutoIncrement', 'isRequired', 'isUnique'] as const).map(
                        (key) => (
                          <td key={key}>
                            <input
                              type="checkbox"
                              checked={field[key]}
                              onChange={(e) =>
                                onChange(
                                  ops.updateField(content, moduleId, entity.id, field.id, {
                                    [key]: e.target.checked,
                                  }),
                                )
                              }
                            />
                          </td>
                        ),
                      )}
                      {(['modelType', 'dtoType', 'validationRule', 'frontendType'] as const).map((key) => (
                        <td key={key}>
                          <input
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
        {entity.fields.length === 0 && <p>Nenhum campo cadastrado.</p>}
        {!readOnly && (
          <button type="button" onClick={() => onChange(ops.addField(content, moduleId, entity.id))}>
            + Campo
          </button>
        )}
      </section>

      <section>
        <h3>Métodos de API</h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Controller</th>
                <th>Service</th>
                <th>Repository</th>
                <th>Código de permissão</th>
                {!readOnly && <th />}
              </tr>
            </thead>
            <tbody>
              {entity.apiMethods.map((method) => (
                <tr key={method.id}>
                  {(['controller', 'service', 'repository'] as const).map((key) => (
                    <td key={key}>
                      {readOnly ? (
                        method[key]
                      ) : (
                        <input
                          value={method[key]}
                          onChange={(e) =>
                            onChange(
                              ops.updateApiMethod(content, moduleId, entity.id, method.id, {
                                [key]: e.target.value,
                              }),
                            )
                          }
                        />
                      )}
                    </td>
                  ))}
                  <td>
                    {readOnly ? (
                      method.permissionCode
                    ) : (
                      <input
                        value={method.permissionCode ?? ''}
                        onChange={(e) =>
                          onChange(
                            ops.updateApiMethod(content, moduleId, entity.id, method.id, {
                              permissionCode: e.target.value || undefined,
                            }),
                          )
                        }
                      />
                    )}
                  </td>
                  {!readOnly && (
                    <td>
                      <button
                        type="button"
                        onClick={() => onChange(ops.removeApiMethod(content, moduleId, entity.id, method.id))}
                      >
                        ×
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {entity.apiMethods.length === 0 && <p>Nenhum método de API cadastrado.</p>}
        {!readOnly && (
          <button type="button" onClick={() => onChange(ops.addApiMethod(content, moduleId, entity.id))}>
            + Método
          </button>
        )}
      </section>

      <section>
        <h3>Regras de Permissão</h3>
        <ul className="list">
          {entity.permissionRules.map((rule) => (
            <li key={rule.id}>
              {readOnly ? (
                <>
                  <strong>{rule.description}</strong> — <code>{rule.codeCondition}</code>
                </>
              ) : (
                <div className="permission-rule-row">
                  <input
                    placeholder="Descrição"
                    value={rule.description}
                    onChange={(e) =>
                      onChange(
                        ops.updatePermissionRule(content, moduleId, entity.id, rule.id, {
                          description: e.target.value,
                        }),
                      )
                    }
                  />
                  <input
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
                  <button
                    type="button"
                    onClick={() => onChange(ops.removePermissionRule(content, moduleId, entity.id, rule.id))}
                  >
                    ×
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
        {entity.permissionRules.length === 0 && <p>Nenhuma regra de permissão cadastrada.</p>}
        {!readOnly && (
          <button type="button" onClick={() => onChange(ops.addPermissionRule(content, moduleId, entity.id))}>
            + Regra
          </button>
        )}
      </section>
    </div>
  )
}
