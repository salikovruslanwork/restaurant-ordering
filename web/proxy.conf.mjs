export const target = 'http://localhost:4500';

// By default the proxy leaves the browser connected when the backend dies, so EventSource never
// sees an error and the app stays "live". Ending the response lets it reconnect.
function endResponseWithBackend(proxy) {
  proxy.on('proxyRes', (backendResponse, _request, response) => {
    backendResponse.on('close', () => {
      if (!response.writableEnded) {
        response.destroy();
      }
    });
  });
}

export default {
  '/api': { target, secure: false, configure: endResponseWithBackend }
};
