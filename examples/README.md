# FinBuddy Backend Integration Examples

This directory contains comprehensive examples for integrating with the FinBuddy Backend API. These examples demonstrate various integration patterns, error handling strategies, and best practices for different frontend frameworks and environments.

## Quick Start Examples

### Basic cURL Examples
See [curl-examples.md](./curl-examples.md) for command-line testing examples.

### JavaScript/TypeScript Integration
See [javascript-integration.js](./javascript-integration.js) for vanilla JavaScript examples.
See [typescript-integration.ts](./typescript-integration.ts) for TypeScript examples with proper typing.

### Frontend Framework Examples
- [React Integration](./react-integration.jsx) - React hooks and components
- [Vue.js Integration](./vue-integration.js) - Vue.js composition API examples
- [Next.js Integration](./nextjs-integration.js) - Next.js API routes and client-side integration

### Error Handling Examples
See [error-handling-examples.js](./error-handling-examples.js) for comprehensive error handling patterns.

### Testing Examples
See [testing-examples.js](./testing-examples.js) for unit and integration testing patterns.

### Integration Guide
See [integration-guide.md](./integration-guide.md) for comprehensive integration patterns and production-ready examples.

### Error Handling Scenarios
See [error-scenarios.md](./error-scenarios.md) for detailed error handling examples and recovery strategies.

## Environment Setup

All examples assume you have:
1. A deployed FinBuddy Backend on Supabase
2. Your Supabase project URL and anon key
3. Proper CORS configuration (already handled by the backend)

## Configuration

Create a `.env` file in your project root:

```env
REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Example Applications

Each example includes:
- ✅ Proper error handling
- ✅ Loading states
- ✅ Retry logic
- ✅ TypeScript support (where applicable)
- ✅ Accessibility considerations
- ✅ Performance optimizations

## Additional Resources

### Production Deployment
See [production-deployment.md](./production-deployment.md) for comprehensive production deployment strategies, security best practices, and monitoring setup.

### Complete Integration Examples
- **HTML/Vanilla JS**: Complete standalone HTML page with FinBuddy integration
- **Progressive Web App**: PWA manifest and service worker examples
- **Error Recovery**: Offline support and request queuing
- **Performance Optimization**: Caching, batching, and optimization strategies