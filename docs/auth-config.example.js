window.BuscaVagasAuthConfig = {
  supabaseUrl: 'https://SEU_PROJECT_REF.supabase.co',
  supabasePublishableKey: 'SUA_PUBLISHABLE_KEY',
  // URL da tela principal com vagas, currículo e compatibilidade.
  // Localmente, use 'http://localhost:3000/'.
  // Em produção, use a URL pública onde o app completo estiver hospedado.
  appUrl: './app.html',
  // Opcional. Se ficar vazio, o app usa `${supabaseUrl}/functions/v1/generate-resume-ai`.
  aiFunctionUrl: '',
};
