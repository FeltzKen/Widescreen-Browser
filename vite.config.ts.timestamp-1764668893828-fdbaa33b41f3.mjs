// vite.config.ts
import { defineConfig } from "file:///home/dev/Projects/WideScreenSplitTabBrowser/node_modules/vite/dist/node/index.js";
import react from "file:///home/dev/Projects/WideScreenSplitTabBrowser/node_modules/@vitejs/plugin-react/dist/index.js";
import electron from "file:///home/dev/Projects/WideScreenSplitTabBrowser/node_modules/vite-plugin-electron/dist/index.mjs";
import renderer from "file:///home/dev/Projects/WideScreenSplitTabBrowser/node_modules/vite-plugin-electron-renderer/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: "electron/main.ts",
        onstart(options) {
          options.startup();
        },
        vite: {
          build: {
            outDir: "dist-electron",
            sourcemap: true
          }
        }
      },
      {
        entry: "electron/preload.cjs",
        vite: {
          build: {
            outDir: "dist-electron",
            sourcemap: true,
            rollupOptions: {
              output: {
                format: "cjs",
                entryFileNames: "preload.cjs"
              }
            }
          }
        }
      }
    ]),
    renderer()
  ],
  server: {
    port: 5173
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9kZXYvUHJvamVjdHMvV2lkZVNjcmVlblNwbGl0VGFiQnJvd3NlclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvZGV2L1Byb2plY3RzL1dpZGVTY3JlZW5TcGxpdFRhYkJyb3dzZXIvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvZGV2L1Byb2plY3RzL1dpZGVTY3JlZW5TcGxpdFRhYkJyb3dzZXIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IGVsZWN0cm9uIGZyb20gJ3ZpdGUtcGx1Z2luLWVsZWN0cm9uJ1xuaW1wb3J0IHJlbmRlcmVyIGZyb20gJ3ZpdGUtcGx1Z2luLWVsZWN0cm9uLXJlbmRlcmVyJ1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICBlbGVjdHJvbihbXG4gICAgICB7XG4gICAgICAgIGVudHJ5OiAnZWxlY3Ryb24vbWFpbi50cycsXG4gICAgICAgIG9uc3RhcnQob3B0aW9ucykge1xuICAgICAgICAgIG9wdGlvbnMuc3RhcnR1cCgpXG4gICAgICAgIH0sXG4gICAgICAgIHZpdGU6IHtcbiAgICAgICAgICBidWlsZDoge1xuICAgICAgICAgICAgb3V0RGlyOiAnZGlzdC1lbGVjdHJvbicsXG4gICAgICAgICAgICBzb3VyY2VtYXA6IHRydWUsXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBlbnRyeTogJ2VsZWN0cm9uL3ByZWxvYWQuY2pzJyxcbiAgICAgICAgdml0ZToge1xuICAgICAgICAgIGJ1aWxkOiB7XG4gICAgICAgICAgICBvdXREaXI6ICdkaXN0LWVsZWN0cm9uJyxcbiAgICAgICAgICAgIHNvdXJjZW1hcDogdHJ1ZSxcbiAgICAgICAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgICAgICAgZm9ybWF0OiAnY2pzJyxcbiAgICAgICAgICAgICAgICBlbnRyeUZpbGVOYW1lczogJ3ByZWxvYWQuY2pzJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgXSksXG4gICAgcmVuZGVyZXIoKVxuICBdLFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiA1MTczXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgZW1wdHlPdXREaXI6IHRydWVcbiAgfVxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBc1QsU0FBUyxvQkFBb0I7QUFDblYsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sY0FBYztBQUNyQixPQUFPLGNBQWM7QUFFckIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sU0FBUztBQUFBLE1BQ1A7QUFBQSxRQUNFLE9BQU87QUFBQSxRQUNQLFFBQVEsU0FBUztBQUNmLGtCQUFRLFFBQVE7QUFBQSxRQUNsQjtBQUFBLFFBQ0EsTUFBTTtBQUFBLFVBQ0osT0FBTztBQUFBLFlBQ0wsUUFBUTtBQUFBLFlBQ1IsV0FBVztBQUFBLFVBQ2I7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLE1BQ0E7QUFBQSxRQUNFLE9BQU87QUFBQSxRQUNQLE1BQU07QUFBQSxVQUNKLE9BQU87QUFBQSxZQUNMLFFBQVE7QUFBQSxZQUNSLFdBQVc7QUFBQSxZQUNYLGVBQWU7QUFBQSxjQUNiLFFBQVE7QUFBQSxnQkFDTixRQUFRO0FBQUEsZ0JBQ1IsZ0JBQWdCO0FBQUEsY0FDbEI7QUFBQSxZQUNGO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRixDQUFDO0FBQUEsSUFDRCxTQUFTO0FBQUEsRUFDWDtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxJQUNSLGFBQWE7QUFBQSxFQUNmO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
