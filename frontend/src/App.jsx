import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import AdminLayout from './components/AdminLayout';
import Home from './pages/Home';
import Scholars from './pages/Scholars';
import Tags from './pages/Tags';
import TagDetail from './pages/TagDetail';
import News from './pages/News';
import ScholarDetail from './pages/ScholarDetail';
import AuthCallback from './pages/AuthCallback';
import Login from './pages/Login';
import Dashboard from './pages/admin/Dashboard';
import ScholarsManagement from './pages/admin/ScholarsManagement';
import ScholarDetailAdmin from './pages/admin/ScholarDetailAdmin';
import ScholarForm from './pages/admin/ScholarForm';
import TagsManagement from './pages/admin/TagsManagement';
import TagForm from './pages/admin/TagForm';
import NewsManagement from './pages/admin/NewsManagement';
import NewsForm from './pages/admin/NewsForm';
import IdentitiesManagement from './pages/admin/IdentitiesManagement';
import IdentityForm from './pages/admin/IdentityForm';
import ImagesManagement from './pages/admin/ImagesManagement';
import UsersManagement from './pages/admin/UsersManagement';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />
            <main className="flex-1"><Home /></main>
            <Footer />
          </div>
        } />
        <Route path="/scholars" element={
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />
            <main className="flex-1"><Scholars /></main>
            <Footer />
          </div>
        } />
        <Route path="/scholars/:id" element={
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />
            <main className="flex-1"><ScholarDetail /></main>
            <Footer />
          </div>
        } />
        <Route path="/tags" element={
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />
            <main className="flex-1"><Tags /></main>
            <Footer />
          </div>
        } />
        <Route path="/tags/:id" element={
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />
            <main className="flex-1"><TagDetail /></main>
            <Footer />
          </div>
        } />
        <Route path="/news" element={
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />
            <main className="flex-1"><News /></main>
            <Footer />
          </div>
        } />

        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="scholars" element={<ScholarsManagement />} />
          <Route path="scholars/new" element={<ScholarForm />} />
          <Route path="scholars/:id" element={<ScholarDetailAdmin />} />
          <Route path="scholars/:id/edit" element={<ScholarForm />} />
          <Route path="tags" element={<TagsManagement />} />
          <Route path="tags/new" element={<TagForm />} />
          <Route path="tags/:id/edit" element={<TagForm />} />
          <Route path="news" element={<NewsManagement />} />
          <Route path="news/new" element={<NewsForm />} />
          <Route path="news/:id/edit" element={<NewsForm />} />
          <Route path="identities" element={<IdentitiesManagement />} />
          <Route path="identities/new" element={<IdentityForm />} />
          <Route path="identities/:id/edit" element={<IdentityForm />} />
          <Route path="images" element={<ImagesManagement />} />
          <Route path="users" element={<UsersManagement />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
