import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center" onClick={closeMobileMenu}>
              <h1 className="text-2xl font-bold text-gray-900">人物数据库</h1>
            </Link>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              <Link
                to="/"
                className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 ${
                  isActive('/')
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-500 border-transparent hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                首页
              </Link>
              <Link
                to="/scholars"
                className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 ${
                  isActive('/scholars')
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-500 border-transparent hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                人物
              </Link>
              <Link
                to="/tags"
                className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 ${
                  isActive('/tags')
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-500 border-transparent hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                标签
              </Link>
              <Link
                to="/news"
                className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 ${
                  isActive('/news')
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-500 border-transparent hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                新闻
              </Link>
            </div>
          </div>

          <div className="hidden sm:flex sm:items-center">
            <Link
              to="/admin"
              target="_blank"
              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              登录后台
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-expanded="false"
            >
              <span className="sr-only">打开主菜单</span>
              {/* Icon when menu is closed */}
              <svg
                className={`${mobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {/* Icon when menu is open */}
              <svg
                className={`${mobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`${mobileMenuOpen ? 'block' : 'hidden'} sm:hidden`}>
        <div className="pt-2 pb-3 space-y-1">
          <Link
            to="/"
            onClick={closeMobileMenu}
            className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
              isActive('/')
                ? 'bg-blue-50 border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            首页
          </Link>
          <Link
            to="/scholars"
            onClick={closeMobileMenu}
            className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
              isActive('/scholars')
                ? 'bg-blue-50 border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            人物
          </Link>
          <Link
            to="/tags"
            onClick={closeMobileMenu}
            className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
              isActive('/tags')
                ? 'bg-blue-50 border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            标签
          </Link>
          <Link
            to="/news"
            onClick={closeMobileMenu}
            className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
              isActive('/news')
                ? 'bg-blue-50 border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            新闻
          </Link>
          <Link
            to="/admin"
            onClick={closeMobileMenu}
            className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
          >
            登录后台
          </Link>
        </div>
      </div>
    </header>
  );
}
