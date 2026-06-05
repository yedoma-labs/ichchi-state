import type { Store } from './types'
import { estimateSize, securityWarn } from './security'

interface HistoryNode<T> {
  id: string
  state: T
  action: string
  timestamp: number
  parent: string | null
  children: string[]
}

interface Branch {
  id: string
  name: string
  head: string
}

/**
 * Git-like branching for state history
 * Allows creating branches, switching between them, and merging
 */
export function createHistoryBranching<T extends object>(
  store: Store<T>,
  options: { 
    maxNodes?: number
    maxMemoryMB?: number // SECURITY: Memory budget limit
  } = {}
) {
  const { maxNodes = 100, maxMemoryMB = 20 } = options
  const maxMemoryBytes = maxMemoryMB * 1024 * 1024
  let totalMemoryBytes = 0

  const nodes = new Map<string, HistoryNode<T>>()
  const branches = new Map<string, Branch>()
  
  let currentNode: string
  let currentBranch = 'main'
  let isNavigating = false

  // Initialize with current state
  const initNode: HistoryNode<T> = {
    id: 'root',
    state: { ...store.getState() },
    action: 'INIT',
    timestamp: Date.now(),
    parent: null,
    children: []
  }
  nodes.set('root', initNode)
  currentNode = 'root'
  branches.set('main', { id: 'main', name: 'main', head: 'root' })

  // Subscribe to changes
  const unsubscribe = store.subscribe((state, _prevState) => {
    // Don't record history during navigation
    if (isNavigating) return
    
    // Get action name from last setState call (simplified)
    const action = 'UPDATE'
    addNode(state, action)
  })

  function addNode(state: T, action: string): string {
    const id = crypto.randomUUID()
    const stateCopy = { ...state }
    const stateSize = estimateSize(stateCopy)
    
    // SECURITY: Check memory budget before adding (CWE-770)
    if (totalMemoryBytes + stateSize > maxMemoryBytes) {
      securityWarn(
        `[Security] History branching memory budget (${maxMemoryMB}MB) exceeded. ` +
        'Pruning old nodes.'
      )
      pruneOldestBranch()
    }
    
    const node: HistoryNode<T> = {
      id,
      state: stateCopy,
      action,
      timestamp: Date.now(),
      parent: currentNode,
      children: []
    }

    // Add to parent's children
    const parent = nodes.get(currentNode)
    if (parent) {
      parent.children.push(id)
    }

    nodes.set(id, node)
    totalMemoryBytes += stateSize
    currentNode = id

    // Update branch head
    const branch = branches.get(currentBranch)
    if (branch) {
      branch.head = id
    }

    // Prune old nodes if exceeding limit
    if (nodes.size > maxNodes) {
      pruneOldestBranch()
    }

    return id
  }

  function pruneOldestBranch(): void {
    // Find and remove nodes from oldest branches
    const sortedNodes = Array.from(nodes.values())
      .sort((a, b) => a.timestamp - b.timestamp)
    
    const toRemove = sortedNodes.slice(0, Math.max(10, Math.floor(maxNodes * 0.2)))
    toRemove.forEach(node => {
      if (node.parent) {
        const parent = nodes.get(node.parent)
        if (parent) {
          parent.children = parent.children.filter(id => id !== node.id)
        }
      }
      
      // SECURITY: Update memory counter
      const nodeSize = estimateSize(node.state)
      totalMemoryBytes -= nodeSize
      
      nodes.delete(node.id)
    })
  }

  return {
    /**
     * Create a new branch from current position
     */
    createBranch(name: string): void {
      if (branches.has(name)) {
        throw new Error(`Branch "${name}" already exists`)
      }

      branches.set(name, {
        id: crypto.randomUUID(),
        name,
        head: currentNode
      })
    },

    /**
     * Switch to a different branch
     */
    checkout(branchName: string): boolean {
      const branch = branches.get(branchName)
      if (!branch) return false

      const node = nodes.get(branch.head)
      if (!node) return false

      currentBranch = branchName
      currentNode = branch.head
      
      isNavigating = true
      store.setState(node.state as any, `CHECKOUT_${branchName}`)
      isNavigating = false
      
      return true
    },

    /**
     * Go to a specific commit
     */
    goto(nodeId: string): boolean {
      const node = nodes.get(nodeId)
      if (!node) return false

      currentNode = nodeId
      
      isNavigating = true
      store.setState(node.state as any, `GOTO_${nodeId}`)
      isNavigating = false
      
      return true
    },

    /**
     * Go back to parent commit
     */
    back(): boolean {
      const node = nodes.get(currentNode)
      if (!node?.parent) return false

      return this.goto(node.parent)
    },

    /**
     * Go forward to first child
     */
    forward(): boolean {
      const node = nodes.get(currentNode)
      if (!node?.children.length) return false

      return this.goto(node.children[0])
    },

    /**
     * Get commit history for current branch
     */
    getHistory(): HistoryNode<T>[] {
      const history: HistoryNode<T>[] = []
      let nodeId: string | null = currentNode

      while (nodeId) {
        const node = nodes.get(nodeId)
        if (!node) break

        history.unshift(node)
        nodeId = node.parent
      }

      return history
    },

    /**
     * Get all branches
     */
    getBranches(): Branch[] {
      return Array.from(branches.values())
    },

    /**
     * Get current branch
     */
    getCurrentBranch(): string {
      return currentBranch
    },

    /**
     * Merge branch into current branch (simple strategy)
     */
    merge(branchName: string): boolean {
      const branch = branches.get(branchName)
      if (!branch) return false

      const branchNode = nodes.get(branch.head)
      if (!branchNode) return false

      // Simple merge: just take the other branch's state (creates new node)
      store.setState(branchNode.state as any, `MERGE_${branchName}`)
      return true
    },

    /**
     * Delete a branch
     */
    deleteBranch(name: string): boolean {
      if (name === 'main' || name === currentBranch) return false
      return branches.delete(name)
    },

    /**
     * Visualize history as ASCII tree
     */
    visualize(): string {
      const lines: string[] = []
      const visited = new Set<string>()

      function traverse(nodeId: string, prefix: string, isLast: boolean): void {
        if (visited.has(nodeId)) return
        visited.add(nodeId)

        const node = nodes.get(nodeId)
        if (!node) return

        const isCurrent = nodeId === currentNode
        const marker = isCurrent ? '●' : '○'
        const label = `${marker} ${node.action} (${new Date(node.timestamp).toLocaleTimeString()})`
        
        lines.push(prefix + (isLast ? '└─ ' : '├─ ') + label)

        const children = node.children
        children.forEach((childId, index) => {
          const isLastChild = index === children.length - 1
          const newPrefix = prefix + (isLast ? '   ' : '│  ')
          traverse(childId, newPrefix, isLastChild)
        })
      }

      traverse('root', '', true)
      return lines.join('\n')
    },

    /**
     * Cleanup
     */
    destroy(): void {
      unsubscribe()
      nodes.clear()
      branches.clear()
    }
  }
}
