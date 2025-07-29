---
inclusion: always
---

# Project Structure & Organization

## File Organization Rules

### Core Structure
```
src/
├── main.ts                    # Plugin entry point (extends Obsidian Plugin)
├── settings.ts                # Plugin settings interface
├── view.tsx                   # React view (extends ItemView)
├── components/                # React components + co-located tests
├── store/                     # Zustand modules by domain
│   ├── cardExplorerStore.ts   # Main store with automatic recomputation
│   ├── filters/               # Filter logic module
│   ├── noteProcessing/        # Note loading & metadata extraction
│   ├── selectors/             # Computed state selectors
│   ├── sorting/               # Sort logic with pin management
│   └── utils/                 # Store constants and utilities
├── types/                     # TypeScript definitions by domain
├── utils/                     # Cross-cutting utilities
└── test/                      # Test utilities (obsidian-mock.ts, setup.ts)
```

### File Naming Conventions
- Components: `ComponentName.tsx` + `ComponentName.test.tsx`
- Store modules: `moduleName.ts` + `moduleName.test.ts`
- Types: Domain-based files (`note.ts`, `filter.ts`, `sort.ts`)
- Utils: Function-based names (`errorHandling.ts`, `dataPersistence.ts`)

### Module Organization
- **Single Responsibility**: Each file handles one specific concern
- **Co-located Tests**: Place `.test.ts` files alongside source files
- **Barrel Exports**: Use `index.ts` files for clean imports
- **Domain Grouping**: Group related functionality in folders

## Architecture Patterns

### Store Module Pattern
```typescript
// Required order: Types → Defaults → Logic → Store
interface ModuleState { ... }
const createDefaultState = () => ({ ... });
const processLogic = (data, config) => { ... };
export const useModuleStore = create<State & Actions>()(...);
```

### Component Structure
- **Container Pattern**: `CardView` orchestrates child components
- **Error Boundaries**: Wrap components with `CardViewErrorBoundary`
- **Co-location**: Keep component and test files together
- **Memoization**: Use `useMemo`/`useCallback` for performance

### Data Flow Architecture
1. **Obsidian APIs** → Store actions (with error handling)
2. **Raw data** → Processing modules → Normalized state
3. **State changes** → Automatic recomputation → UI updates
4. **User actions** → Store actions → State updates

## Key Structural Rules

### Store Organization
- Main store in `cardExplorerStore.ts` with automatic recomputation
- Domain modules in subfolders (`filters/`, `noteProcessing/`, etc.)
- All business logic contained within store modules
- No direct Obsidian API calls outside store

### Component Organization
- `CardView.tsx`: Main container component
- `CardViewErrorBoundary.tsx`: Error boundary wrapper
- Presenter components: `FilterPanel`, `VirtualList`, `NoteCard`
- All components must handle loading and error states

### Type Organization
- Domain-specific type files (`note.ts`, `filter.ts`, `sort.ts`)
- Comprehensive interfaces for all data structures
- Type guards for external data validation
- Export types through `types/index.ts`

### Utility Organization
- `errorHandling.ts`: Categorized error handling system
- `dataPersistence.ts`: Data loading/saving with validation
- `validation.ts`: Runtime data validation functions

## Testing Structure
- **Unit Tests**: Co-located with source files
- **Integration Tests**: `integration.test.ts` for data flow
- **Mock Setup**: Use `test/obsidian-mock.ts` for Obsidian APIs
- **Test Config**: Centralized setup in `test/setup.ts`

## Extension Guidelines
- **New Components**: Add to `components/` with co-located test
- **New Store Logic**: Create module in appropriate `store/` subfolder
- **New Types**: Add to domain-specific file in `types/`
- **New Utils**: Add to `utils/` with descriptive filename
