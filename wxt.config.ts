import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'CoursePilot',
    version: '0.1.0',
    description: 'AI-powered course companion — quizzes, explanations, and mastery tracking for any online course',
    permissions: ['storage', 'sidePanel', 'activeTab'],
    side_panel: {
      default_path: 'sidepanel.html',
    },
    action: {},
    commands: {
      _execute_action: {
        suggested_key: { default: 'Alt+Shift+C' },
        description: 'Open CoursePilot side panel',
      },
    },
  },
});
