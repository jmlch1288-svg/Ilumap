import './App.css'
function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-600 via-indigo-700 to-purple-800 flex items-center justify-center p-8">
      <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-12 text-center max-w-2xl border border-white/20">
        {/* Bombilla luminaria encendida */}
        <div className="w-40 h-40 bg-yellow-300 rounded-full mx-auto mb-10 shadow-2xl animate-pulse ring-8 ring-yellow-400/50 flex items-center justify-center">
          <div className="text-6xl">💡</div>
        </div>

        <h1 className="text-6xl font-black text-gray-800 mb-6 tracking-tight">
          ¡Todo Funciona Perfecto!
        </h1>
        
        <p className="text-2xl text-gray-700 font-medium mb-8">
          Sistema de Gestión de Alumbrado Público
        </p>

        <p className="text-lg text-gray-600 leading-relaxed">
          Tailwind CSS v4 + Vite + React + TypeScript<br />
          Entorno completo configurado y listo para desarrollar 🚀
        </p>

        <div className="mt-12 flex gap-6 justify-center">
          <div className="bg-green-500 text-white px-8 py-4 rounded-xl text-xl font-bold shadow-lg">
            Fase 0 Completada
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
