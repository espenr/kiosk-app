# Widget Development Checklist

Use this checklist when developing new widgets to ensure you've covered all requirements.

## Planning Phase

- [ ] **Define Purpose**: Clearly define what the widget will do
- [ ] **Identify Requirements**: List all features and functionality needed
- [ ] **Design UI/UX**: Create rough sketches or wireframes
- [ ] **Identify Data Sources**: Determine what data the widget needs and where it will come from
- [ ] **Define Configuration Options**: List all configurable aspects of the widget

## Implementation Phase

### Types and Configuration

- [ ] Add widget type to `WidgetType` union in `src/types/widget.ts`
- [ ] Create widget config interface extending `BaseWidgetConfig`
- [ ] Add widget config to `WidgetConfig` union type
- [ ] Define default configuration values

### Components

- [ ] Create main widget component file
- [ ] Create widget configuration component file
- [ ] Implement responsive layout for different sizes
- [ ] Apply proper styling with Chakra UI
- [ ] Add theme support (light/dark mode)
- [ ] Implement proper loading states
- [ ] Implement error handling

### Data Handling

- [ ] Implement data fetching logic (if needed)
- [ ] Add data caching with TTL
- [ ] Implement refresh mechanism
- [ ] Handle offline scenarios
- [ ] Add error retry logic

### Widget Registration

- [ ] Register widget type with the registry
- [ ] Define widget capabilities
- [ ] Implement factory function for creating instances
- [ ] Add widget to the widget selector UI

### Performance Optimization

- [ ] Memoize expensive calculations
- [ ] Optimize re-renders
- [ ] Implement proper cleanup in useEffect
- [ ] Add batching for frequent updates

## Testing Phase

- [ ] Create unit tests for widget logic
- [ ] Create component tests for rendering
- [ ] Test widget with various configurations
- [ ] Test with different screen sizes
- [ ] Test in both light and dark themes
- [ ] Test error handling cases
- [ ] Test widget registration and lifecycle
- [ ] Create test page for manual testing

## Documentation Phase

- [ ] Update widget types documentation
- [ ] Document widget configuration options
- [ ] Add usage examples
- [ ] Document any API integrations
- [ ] Add information to the Widget Development Guide
- [ ] Create test plan document

## Accessibility

- [ ] Ensure proper color contrast
- [ ] Add aria attributes for screen readers
- [ ] Support keyboard navigation
- [ ] Test with screen reader

## Final Checks

- [ ] Lint code (`npm run lint`)
- [ ] Type check (`npm run typecheck`)
- [ ] Run all tests (`npm test`)
- [ ] Update CLAUDE.md with task completion
- [ ] Create task summary document