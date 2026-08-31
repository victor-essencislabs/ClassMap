import '@testing-library/jest-dom'

// TASK-019 (ADR-007): Node 22+ registra um `globalThis.localStorage`
// experimental próprio (atrás da flag `--localstorage-file`) que chega
// antes do ambiente jsdom do Vitest conseguir instalar o dele — sem
// isso, qualquer teste que use `localStorage`/`window.localStorage`
// (persistência de tema) quebra com "Cannot read properties of
// undefined". Substituído por uma implementação simples em memória,
// suficiente para testes (não precisa persistir entre execuções).
class MemoryStorage implements Storage {
  private store = new Map<string, string>()

  get length() {
    return this.store.size
  }

  clear() {
    this.store.clear()
  }

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string) {
    this.store.delete(key)
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value))
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  configurable: true,
  writable: true,
})
