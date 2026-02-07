import './style.css';
import ReactDOM from 'react-dom/client';
import App from './App';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  registration: 'manifest',

  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'coursepilot-ui',
      position: 'overlay',
      zIndex: 2147483647,
      onMount: (container) => {
        const wrapper = document.createElement('div');
        wrapper.id = 'coursepilot-root';
        container.append(wrapper);

        const root = ReactDOM.createRoot(wrapper);
        root.render(<App />);
        return root;
      },
      onRemove: (root) => {
        root?.unmount();
      },
    });

    ui.mount();
  },
});
