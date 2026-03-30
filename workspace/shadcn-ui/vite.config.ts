export default defineConfig(({ mode }) => ({
  plugins: [
    viteSourceLocator({
      prefix: "mgx",
    }),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  preview: {
    host: true,
    port: 10000,
   allowedHosts: [
  'payment-app-3-7nj7.onrender.com'
]
  }
}));
