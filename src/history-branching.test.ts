import { describe, it, expect, vi } from 'vitest'
import { createStore } from './store'
import { createHistoryBranching } from './history-branching'

describe('History Branching', () => {
  describe('Basic Operations', () => {
    it('should initialize with root node', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      const commits = history.getHistory()
      expect(commits.length).toBe(1)
      expect(commits[0].action).toBe('INIT')
    })

    it('should add nodes on state changes', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      store.setState({ value: 1 })
      store.setState({ value: 2 })

      const commits = history.getHistory()
      expect(commits.length).toBe(3) // root + 2 updates
    })

    it('should navigate backward in history', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      store.setState({ value: 1 })
      store.setState({ value: 2 })
      store.setState({ value: 3 })

      history.back()
      expect(store.getState().value).toBe(2)

      history.back()
      expect(store.getState().value).toBe(1)

      history.back()
      expect(store.getState().value).toBe(0)
    })

    it('should navigate forward in history', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      store.setState({ value: 1 })
      store.setState({ value: 2 })

      history.back()
      history.back()

      history.forward()
      expect(store.getState().value).toBe(1)

      history.forward()
      expect(store.getState().value).toBe(2)
    })

    it('should not go back beyond root', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      history.back()
      history.back()
      history.back()

      expect(store.getState().value).toBe(0)
    })

    it('should not go forward when at head', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      store.setState({ value: 1 })

      const currentValue = store.getState().value
      history.forward()
      history.forward()

      expect(store.getState().value).toBe(currentValue)
    })
  })

  describe('Branch Management', () => {
    it('should create a new branch', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      store.setState({ value: 1 })

      history.createBranch('feature')

      const branches = history.getBranches()
      expect(branches.map(b => b.name)).toContain('feature')
    })

    it('should checkout existing branch', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      store.setState({ value: 1 })
      
      history.createBranch('feature')
      history.checkout('feature')
      
      store.setState({ value: 2 })

      history.checkout('main')
      expect(store.getState().value).toBe(1)

      history.checkout('feature')
      expect(store.getState().value).toBe(2)
    })

    it('should return false when checking out non-existent branch', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      const result = history.checkout('nonexistent')
      expect(result).toBe(false)
    })

    it('should delete a branch', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      history.createBranch('temp')
      
      let branches = history.getBranches()
      expect(branches.map(b => b.name)).toContain('temp')

      history.deleteBranch('temp')

      branches = history.getBranches()
      expect(branches.map(b => b.name)).not.toContain('temp')
    })

    it('should not delete current branch', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      const result = history.deleteBranch('main')
      expect(result).toBe(false)
    })

    it('should get list of all branches', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      history.createBranch('feature1')
      history.createBranch('feature2')
      history.createBranch('hotfix')

      const branches = history.getBranches()
      expect(branches.length).toBe(4) // main + 3 created
      expect(branches.map(b => b.name)).toEqual(['main', 'feature1', 'feature2', 'hotfix'])
    })
  })

  describe('Navigation with Branches', () => {
    it('should handle forward with multiple children', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      store.setState({ value: 1 })
      
      // Create diverging history
      history.createBranch('branch1')
      history.checkout('branch1')
      store.setState({ value: 2 })

      history.checkout('main')
      history.back() // Go to value: 0
      
      history.createBranch('branch2')
      history.checkout('branch2')
      store.setState({ value: 3 })

      // The node with value: 1 now has two children
      // Forward should go to most recent child
      history.checkout('main')
      history.back()
      history.forward()

      // Should go to one of the children (most recent)
      expect([1, 2, 3]).toContain(store.getState().value)
    })
  })

  describe('Pruning', () => {
    it('should prune old nodes when exceeding maxNodes', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store, { maxNodes: 10 })

      // Add more than maxNodes
      for (let i = 1; i <= 15; i++) {
        store.setState({ value: i })
      }

      const commits = history.getHistory()
      // Should have pruned some nodes
      expect(commits.length).toBeLessThanOrEqual(10)
    })

    it('should not prune nodes in active branches', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store, { maxNodes: 10 })

      // Create some history on main
      for (let i = 1; i <= 5; i++) {
        store.setState({ value: i })
      }

      history.createBranch('keep')
      history.checkout('keep')

      // Add more nodes to trigger pruning
      for (let i = 6; i <= 20; i++) {
        store.setState({ value: i })
      }

      // Branch 'keep' should still exist
      const branches = history.getBranches()
      expect(branches.map(b => b.name)).toContain('keep')
    })
  })

  describe('Commit Details', () => {
    it('should include commit metadata', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      store.setState({ value: 1 })

      const commits = history.getHistory()
      const lastCommit = commits[commits.length - 1]

      expect(lastCommit).toHaveProperty('id')
      expect(lastCommit).toHaveProperty('state')
      expect(lastCommit).toHaveProperty('action')
      expect(lastCommit).toHaveProperty('timestamp')
      expect(lastCommit.state.value).toBe(1)
    })

    it('should track parent-child relationships', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      store.setState({ value: 1 })
      store.setState({ value: 2 })

      const commits = history.getHistory()
      
      // Each commit should have a parent (except root)
      for (let i = 1; i < commits.length; i++) {
        expect(commits[i].parent).toBeTruthy()
      }

      // Root should have no parent
      expect(commits[0].parent).toBeNull()
    })
  })

  describe('Complex Branching Scenarios', () => {
    it('should handle multiple branches diverging from same point', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      store.setState({ value: 1 })

      history.createBranch('feature-a')
      history.createBranch('feature-b')
      history.createBranch('feature-c')

      history.checkout('feature-a')
      store.setState({ value: 2 })

      history.checkout('feature-b')
      store.setState({ value: 3 })

      history.checkout('feature-c')
      store.setState({ value: 4 })

      // All branches should exist
      const branches = history.getBranches()
      expect(branches.length).toBe(4) // main + 3 features

      // Check each branch has correct value
      history.checkout('feature-a')
      expect(store.getState().value).toBe(2)

      history.checkout('feature-b')
      expect(store.getState().value).toBe(3)

      history.checkout('feature-c')
      expect(store.getState().value).toBe(4)
    })

    it('should maintain branch heads correctly', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      store.setState({ value: 1 })
      store.setState({ value: 2 })

      const mainBranch = history.getBranches().find(b => b.name === 'main')
      const currentHead = mainBranch?.head

      store.setState({ value: 3 })

      const updatedBranch = history.getBranches().find(b => b.name === 'main')
      
      // Head should have moved
      expect(updatedBranch?.head).not.toBe(currentHead)
    })

    it('should handle rapid state changes', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      // Rapidly change state
      for (let i = 1; i <= 100; i++) {
        store.setState({ value: i })
      }

      const commits = history.getHistory()
      expect(commits.length).toBeGreaterThan(0)

      // Should be able to navigate back
      history.back()
      expect(store.getState().value).toBe(99)
    })
  })

  describe('Cleanup', () => {
    it('should cleanup on destroy', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      store.setState({ value: 1 })

      history.destroy()

      // After destroy, state changes should not be tracked
      const commitsBeforeChange = history.getHistory().length
      store.setState({ value: 2 })
      const commitsAfterChange = history.getHistory().length

      expect(commitsAfterChange).toBe(commitsBeforeChange)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty state object', () => {
      const store = createStore({})
      const history = createHistoryBranching(store)

      const commits = history.getHistory()
      expect(commits.length).toBe(1)
      expect(commits[0].state).toEqual({})
    })

    it('should handle complex nested state', () => {
      const store = createStore({
        user: {
          profile: {
            name: 'Alice',
            settings: {
              theme: 'dark'
            }
          }
        }
      })
      const history = createHistoryBranching(store)

      store.setState({
        user: {
          profile: {
            name: 'Bob',
            settings: {
              theme: 'light'
            }
          }
        }
      })

      history.back()
      expect(store.getState().user.profile.name).toBe('Alice')

      history.forward()
      expect(store.getState().user.profile.name).toBe('Bob')
    })

    it('should handle arrays in state', () => {
      const store = createStore({ items: [1, 2, 3] })
      const history = createHistoryBranching(store)

      store.setState({ items: [1, 2, 3, 4] })
      store.setState({ items: [1, 2, 3, 4, 5] })

      history.back()
      expect(store.getState().items).toEqual([1, 2, 3, 4])

      history.back()
      expect(store.getState().items).toEqual([1, 2, 3])
    })

    it('should handle multiple back/forward calls', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      for (let i = 1; i <= 5; i++) {
        store.setState({ value: i })
      }

      // Go all the way back
      for (let i = 0; i < 10; i++) {
        history.back()
      }

      expect(store.getState().value).toBe(0)

      // Go all the way forward
      for (let i = 0; i < 10; i++) {
        history.forward()
      }

      expect(store.getState().value).toBe(5)
    })
  })

  describe('Branch Names', () => {
    it('should throw error for duplicate branch names', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      history.createBranch('feature')

      expect(() => {
        history.createBranch('feature')
      }).toThrow('Branch "feature" already exists')
    })

    it('should not allow creating branch with "main" name', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      // "main" already exists, should throw
      expect(() => {
        history.createBranch('main')
      }).toThrow()
    })

    it('should handle branch names with special characters', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      history.createBranch('feature/add-login')
      history.createBranch('bugfix-123')
      history.createBranch('release_v1.0')

      const branches = history.getBranches()
      expect(branches.map(b => b.name)).toContain('feature/add-login')
      expect(branches.map(b => b.name)).toContain('bugfix-123')
      expect(branches.map(b => b.name)).toContain('release_v1.0')
    })
  })

  describe('Merge Operations', () => {
    it('should merge branch into current branch', () => {
      const store = createStore({ value: 0, name: 'initial' })
      const history = createHistoryBranching(store)

      store.setState({ value: 1 })
      
      history.createBranch('feature')
      history.checkout('feature')
      store.setState({ value: 2, name: 'feature-work' })

      history.checkout('main')
      expect(store.getState().value).toBe(1)
      expect(store.getState().name).toBe('initial')

      const result = history.merge('feature')
      expect(result).toBe(true)
      expect(store.getState().value).toBe(2)
      expect(store.getState().name).toBe('feature-work')
    })

    it('should return false when merging non-existent branch', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      const result = history.merge('nonexistent')
      expect(result).toBe(false)
    })

    it('should handle merge creating new commit', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      store.setState({ value: 1 })
      const historyBefore = history.getHistory().length

      history.createBranch('feature')
      history.checkout('feature')
      store.setState({ value: 2 })

      history.checkout('main')
      history.merge('feature')

      const historyAfter = history.getHistory().length
      expect(historyAfter).toBeGreaterThan(historyBefore)
    })
  })

  describe('Goto Navigation', () => {
    it('should go to specific commit by ID', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      store.setState({ value: 1 })
      store.setState({ value: 2 })
      const commits = history.getHistory()
      
      const middleCommitId = commits[1].id
      const result = history.goto(middleCommitId)

      expect(result).toBe(true)
      expect(store.getState().value).toBe(1)
    })

    it('should return false for invalid commit ID', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      const result = history.goto('invalid-id')
      expect(result).toBe(false)
    })

    it('should handle goto with complex navigation', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      store.setState({ value: 1 })
      store.setState({ value: 2 })
      store.setState({ value: 3 })
      
      const commits = history.getHistory()
      const rootId = commits[0].id
      const lastId = commits[commits.length - 1].id

      history.goto(rootId)
      expect(store.getState().value).toBe(0)

      history.goto(lastId)
      expect(store.getState().value).toBe(3)
    })
  })

  describe('Visualization', () => {
    it('should generate ASCII tree visualization', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      store.setState({ value: 1 })
      store.setState({ value: 2 })

      const visualization = history.visualize()
      
      expect(visualization).toContain('INIT')
      expect(visualization).toContain('UPDATE')
      expect(visualization).toContain('●') // current marker
    })

    it('should show current node in visualization', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      store.setState({ value: 1 })
      history.back()

      const visualization = history.visualize()
      const lines = visualization.split('\n')
      
      // The current node should have ● marker
      const currentLine = lines.find(line => line.includes('●'))
      expect(currentLine).toBeTruthy()
    })

    it('should handle visualization with branches', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      store.setState({ value: 1 })
      
      history.createBranch('feature')
      history.checkout('feature')
      store.setState({ value: 2 })
      store.setState({ value: 3 })

      const visualization = history.visualize()
      
      expect(visualization).toBeTruthy()
      expect(visualization.split('\n').length).toBeGreaterThan(1)
    })

    it('should handle visualization with multiple children', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      store.setState({ value: 1 })
      const commits = history.getHistory()
      const forkPoint = commits[commits.length - 1].id

      history.createBranch('branch-a')
      history.checkout('branch-a')
      store.setState({ value: 2 })

      history.goto(forkPoint)
      history.createBranch('branch-b')
      history.checkout('branch-b')
      store.setState({ value: 3 })

      const visualization = history.visualize()
      
      // Should show tree structure with branches (at least multiple lines)
      expect(visualization.split('\n').length).toBeGreaterThan(2)
      // The visualization includes branch indicators like ├─ or └─
      expect(visualization).toMatch(/[├└]/)
    })
  })

  describe('getCurrentBranch', () => {
    it('should return current branch name', () => {
      const store = createStore({ value: 0 })
      const history = createHistoryBranching(store)

      expect(history.getCurrentBranch()).toBe('main')

      history.createBranch('feature')
      history.checkout('feature')
      expect(history.getCurrentBranch()).toBe('feature')

      history.checkout('main')
      expect(history.getCurrentBranch()).toBe('main')
    })
  })
})
