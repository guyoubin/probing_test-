import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './assets/cyberpunk-theme.css';
import './assets/animations.css';

const app = createApp(App);
app.use(router);
app.mount('#app');
