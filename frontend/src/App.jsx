import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Scholars from './pages/Scholars';
import Tags from './pages/Tags';
import TagDetail from './pages/TagDetail';
import News from './pages/News';
import ScholarDetail from './pages/ScholarDetail';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/scholars" element={<Scholars />} />
            <Route path="/scholars/:id" element={<ScholarDetail />} />
            <Route path="/tags" element={<Tags />} />
            <Route path="/tags/:id" element={<TagDetail />} />
            <Route path="/news" element={<News />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
