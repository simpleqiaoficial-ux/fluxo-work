import { Routes, Route } from 'react-router'

function Home() {
  return (
    <main>
      <h1>FluxoWork</h1>
      <p>Fundação do projeto — este placeholder será substituído pelas telas de cada módulo.</p>
    </main>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  )
}

export default App
