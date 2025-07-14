import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Create Auth Context
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchCurrentUser(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async (token) => {
    try {
      const response = await axios.get(`${API}/current_user`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    const response = await axios.post(`${API}/token`, formData);
    const token = response.data.access_token;
    localStorage.setItem('token', token);
    await fetchCurrentUser(token);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const register = async (userData) => {
    const formData = new FormData();
    Object.keys(userData).forEach(key => {
      formData.append(key, userData[key]);
    });
    return await axios.post(`${API}/register`, formData);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Header Component
const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <div className="logo">
            <div className="logo-circle">
              <svg viewBox="0 0 100 100" className="logo-svg">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#fff8e1" strokeWidth="2"/>
                <circle cx="50" cy="50" r="15" fill="none" stroke="#fff8e1" strokeWidth="1.5"/>
                <path d="M35,35 Q50,20 65,35" fill="none" stroke="#fff8e1" strokeWidth="1"/>
                <path d="M35,65 Q50,80 65,65" fill="none" stroke="#fff8e1" strokeWidth="1"/>
                <circle cx="50" cy="30" r="3" fill="#fff8e1"/>
                <circle cx="30" cy="50" r="3" fill="#fff8e1"/>
                <circle cx="70" cy="50" r="3" fill="#fff8e1"/>
                <circle cx="50" cy="70" r="3" fill="#fff8e1"/>
              </svg>
            </div>
            <div className="logo-text">
              <h1>La Revista Nacional de las Ciencias para Estudiantes</h1>
              <p>Afiliada a Penta UC</p>
            </div>
          </div>
        </div>
        <nav className="nav">
          <Link to="/" className="nav-link">Inicio</Link>
          <Link to="/about" className="nav-link">Quiénes Somos</Link>
          <Link to="/submit" className="nav-link">Enviar Paper</Link>
          <Link to="/apply-admin" className="nav-link">Ser Revisor</Link>
          <Link to="/papers" className="nav-link">Publicaciones</Link>
          {user?.role === 'admin' || user?.role === 'super_admin' ? (
            <Link to="/admin" className="nav-link">Admin</Link>
          ) : null}
          {user ? (
            <div className="user-menu">
              <span className="user-name">{user.name}</span>
              <button onClick={handleLogout} className="btn-logout">Cerrar Sesión</button>
            </div>
          ) : (
            <Link to="/login" className="nav-link">Iniciar Sesión</Link>
          )}
        </nav>
      </div>
    </header>
  );
};

// Home Component
const Home = () => {
  return (
    <div className="page">
      <main className="container">
        <section className="hero">
          <h2>Bienvenidos a la Revista Nacional de las Ciencias para Estudiantes</h2>
          <p className="hero-subtitle">
            Una plataforma académica para estudiantes que desean publicar investigaciones científicas de calidad, 
            afiliada a Penta UC.
          </p>
          <div className="hero-buttons">
            <Link to="/submit" className="btn btn-primary">Enviar Paper</Link>
            <Link to="/papers" className="btn btn-secondary">Ver Publicaciones</Link>
          </div>
        </section>

        <section className="features">
          <div className="feature-grid">
            <div className="feature-card">
              <h3>Revisión Rigurosa</h3>
              <p>Proceso de revisión por pares para garantizar la calidad académica</p>
            </div>
            <div className="feature-card">
              <h3>Acceso Abierto</h3>
              <p>Publicaciones gratuitas y accesibles para toda la comunidad académica</p>
            </div>
            <div className="feature-card">
              <h3>Interdisciplinario</h3>
              <p>Aceptamos investigaciones de todas las áreas del conocimiento</p>
            </div>
            <div className="feature-card">
              <h3>Tiempos Rápidos</h3>
              <p>Respuesta eficiente y tiempos de publicación optimizados</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

// About Component
const About = () => {
  return (
    <div className="page">
      <main className="container">
        <h2>Quiénes Somos</h2>
        <div className="about-content">
          <section className="about-section">
            <h3>Nuestra Historia</h3>
            <p>
              La Revista Nacional de las Ciencias para Estudiantes es una iniciativa estudiantil 
              afiliada a Penta UC, dedicada a promover la investigación científica entre estudiantes 
              escolares y universitarios de toda América Latina.
            </p>
          </section>

          <section className="about-section">
            <h3>Misión y Visión</h3>
            <p>
              <strong>Misión:</strong> Proporcionar una plataforma accesible y rigurosa para que 
              estudiantes publiquen investigaciones de calidad, fomentando el desarrollo del 
              pensamiento científico y la comunicación académica.
            </p>
            <p>
              <strong>Visión:</strong> Ser la revista científica estudiantil de referencia en 
              América Latina, promoviendo el rigor académico y la colaboración interdisciplinaria.
            </p>
          </section>

          <section className="about-section">
            <h3>Por Qué Elegirnos</h3>
            <ul className="benefits-list">
              <li><strong>Proceso de revisión riguroso:</strong> Evaluación por expertos en cada área</li>
              <li><strong>Acceso abierto gratuito:</strong> Sin costos para autores ni lectores</li>
              <li><strong>Enfoque interdisciplinario:</strong> Todas las áreas del conocimiento</li>
              <li><strong>Tiempos de respuesta rápidos:</strong> Proceso eficiente y transparente</li>
              <li><strong>Apoyo editorial:</strong> Acompañamiento en el proceso de publicación</li>
            </ul>
          </section>

          <section className="about-section">
            <h3>Categorías de Investigación</h3>
            <div className="categories-grid">
              <div className="category-item">Matemáticas</div>
              <div className="category-item">Física</div>
              <div className="category-item">Química</div>
              <div className="category-item">Biología</div>
              <div className="category-item">Medicina</div>
              <div className="category-item">Psicología</div>
              <div className="category-item">Sociología</div>
              <div className="category-item">Historia</div>
              <div className="category-item">Economía</div>
              <div className="category-item">Ingeniería</div>
              <div className="category-item">Informática</div>
              <div className="category-item">Astronomía</div>
              <div className="category-item">Geología</div>
              <div className="category-item">Antropología</div>
              <div className="category-item">Filosofía</div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

// Submit Paper Component
const SubmitPaper = () => {
  const [formData, setFormData] = useState({
    title: '',
    authors: '',
    institution: '',
    email: '',
    category: '',
    abstract: '',
    keywords: '',
    word_count: '',
    file: null
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'word_count') {
          submitData.append(key, parseInt(formData[key]));
        } else {
          submitData.append(key, formData[key]);
        }
      });

      const response = await axios.post(`${API}/submit-paper`, submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage('Paper enviado exitosamente. DOI: ' + response.data.doi);
      setTimeout(() => {
        navigate('/papers');
      }, 3000);
    } catch (error) {
      setMessage('Error al enviar el paper: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
  };

  return (
    <div className="page">
      <main className="container">
        <h2>Enviar Paper</h2>
        <form onSubmit={handleSubmit} className="paper-form">
          <div className="form-group">
            <label>Título *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label>Autores (separados por comas) *</label>
            <input
              type="text"
              name="authors"
              value={formData.authors}
              onChange={handleChange}
              className="form-input"
              placeholder="Ej: Juan Pérez, María García"
              required
            />
          </div>

          <div className="form-group">
            <label>Institución *</label>
            <input
              type="text"
              name="institution"
              value={formData.institution}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label>Email de contacto *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label>Categoría *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="form-input"
              required
            >
              <option value="">Selecciona una categoría</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Resumen *</label>
            <textarea
              name="abstract"
              value={formData.abstract}
              onChange={handleChange}
              className="form-textarea"
              rows="6"
              required
            />
          </div>

          <div className="form-group">
            <label>Palabras clave (separadas por comas) *</label>
            <input
              type="text"
              name="keywords"
              value={formData.keywords}
              onChange={handleChange}
              className="form-input"
              placeholder="Ej: investigación, metodología, análisis"
              required
            />
          </div>

          <div className="form-group">
            <label>Número de palabras (2000-8000) *</label>
            <input
              type="number"
              name="word_count"
              value={formData.word_count}
              onChange={handleChange}
              className="form-input"
              min="2000"
              max="8000"
              required
            />
          </div>

          <div className="form-group">
            <label>Archivo del paper (.doc o .docx) *</label>
            <input
              type="file"
              name="file"
              onChange={handleChange}
              className="form-input"
              accept=".doc,.docx"
              required
            />
          </div>

          {message && (
            <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar Paper'}
          </button>
        </form>
      </main>
    </div>
  );
};

// Apply Admin Component
const ApplyAdmin = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    institution: '',
    cv: null,
    motivation_letter: '',
    specialization: '',
    references: '',
    experience: '',
    certificates: null
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key]);
      });

      await axios.post(`${API}/apply-admin`, submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage('Solicitud enviada exitosamente. Te contactaremos pronto.');
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      setMessage('Error al enviar la solicitud: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
  };

  return (
    <div className="page">
      <main className="container">
        <h2>Solicitud para Ser Revisor</h2>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label>Nombre completo *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label>Institución *</label>
            <input
              type="text"
              name="institution"
              value={formData.institution}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label>CV (.pdf, .doc o .docx) *</label>
            <input
              type="file"
              name="cv"
              onChange={handleChange}
              className="form-input"
              accept=".pdf,.doc,.docx"
              required
            />
          </div>

          <div className="form-group">
            <label>Carta de motivación (mínimo 500 palabras) *</label>
            <textarea
              name="motivation_letter"
              value={formData.motivation_letter}
              onChange={handleChange}
              className="form-textarea"
              rows="8"
              required
            />
          </div>

          <div className="form-group">
            <label>Áreas de especialización (separadas por comas) *</label>
            <input
              type="text"
              name="specialization"
              value={formData.specialization}
              onChange={handleChange}
              className="form-input"
              placeholder="Ej: Física, Matemáticas, Astronomía"
              required
            />
          </div>

          <div className="form-group">
            <label>Referencias (separadas por comas) *</label>
            <input
              type="text"
              name="references"
              value={formData.references}
              onChange={handleChange}
              className="form-input"
              placeholder="Nombres y contactos de referencias académicas"
              required
            />
          </div>

          <div className="form-group">
            <label>Experiencia en revisión por pares *</label>
            <textarea
              name="experience"
              value={formData.experience}
              onChange={handleChange}
              className="form-textarea"
              rows="4"
              required
            />
          </div>

          <div className="form-group">
            <label>Certificados (.pdf, .doc o .docx) *</label>
            <input
              type="file"
              name="certificates"
              onChange={handleChange}
              className="form-input"
              accept=".pdf,.doc,.docx"
              required
            />
          </div>

          {message && (
            <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar Solicitud'}
          </button>
        </form>
      </main>
    </div>
  );
};

// Papers Component
const Papers = () => {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    author: '',
    institution: ''
  });

  useEffect(() => {
    fetchPapers();
  }, [filters]);

  const fetchPapers = async () => {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await axios.get(`${API}/papers?${params}`);
      setPapers(response.data);
    } catch (error) {
      console.error('Error fetching papers:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCitation = (paper) => {
    const year = new Date(paper.submission_date).getFullYear();
    return `${paper.authors.join(', ')}. (${year}). ${paper.title}. La Revista Nacional de las Ciencias para Estudiantes. DOI: ${paper.doi}`;
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return <div className="page"><div className="container"><p>Cargando publicaciones...</p></div></div>;
  }

  return (
    <div className="page">
      <main className="container">
        <h2>Publicaciones</h2>
        
        <div className="filters">
          <input
            type="text"
            name="category"
            placeholder="Filtrar por categoría"
            value={filters.category}
            onChange={handleFilterChange}
            className="filter-input"
          />
          <input
            type="text"
            name="author"
            placeholder="Filtrar por autor"
            value={filters.author}
            onChange={handleFilterChange}
            className="filter-input"
          />
          <input
            type="text"
            name="institution"
            placeholder="Filtrar por institución"
            value={filters.institution}
            onChange={handleFilterChange}
            className="filter-input"
          />
        </div>

        <div className="papers-list">
          {papers.length === 0 ? (
            <p>No se encontraron publicaciones.</p>
          ) : (
            papers.map(paper => (
              <div key={paper.id} className="paper-card">
                <h3>{paper.title}</h3>
                <p><strong>Autores:</strong> {paper.authors.join(', ')}</p>
                <p><strong>Institución:</strong> {paper.institution}</p>
                <p><strong>Categoría:</strong> {paper.category}</p>
                <p><strong>Palabras clave:</strong> {paper.keywords.join(', ')}</p>
                <p><strong>DOI:</strong> {paper.doi}</p>
                <p><strong>Resumen:</strong> {paper.abstract}</p>
                <div className="paper-actions">
                  <a href={paper.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                    Descargar Paper
                  </a>
                </div>
                <div className="citation">
                  <strong>Citación APA:</strong>
                  <p className="citation-text">{generateCitation(paper)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

// Login Component
const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    institution: '',
    study_area: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        navigate('/');
      } else {
        await register(formData);
        setMessage('Usuario registrado exitosamente. Ahora puedes iniciar sesión.');
        setIsLogin(true);
      }
    } catch (error) {
      setMessage('Error: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="page">
      <main className="container">
        <div className="auth-container">
          <h2>{isLogin ? 'Iniciar Sesión' : 'Registrarse'}</h2>
          
          <div className="auth-toggle">
            <button
              type="button"
              className={`toggle-btn ${isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(true)}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              className={`toggle-btn ${!isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(false)}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label>Contraseña *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            {!isLogin && (
              <>
                <div className="form-group">
                  <label>Nombre completo *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Institución *</label>
                  <input
                    type="text"
                    name="institution"
                    value={formData.institution}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Área de estudio *</label>
                  <input
                    type="text"
                    name="study_area"
                    value={formData.study_area}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
              </>
            )}

            {message && (
              <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
                {message}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Registrarse')}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

// Admin Dashboard Component
const AdminDashboard = () => {
  const { user } = useAuth();
  const [papers, setPapers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'super_admin')) {
      fetchPendingPapers();
      fetchApplications();
    }
  }, [user]);

  const fetchPendingPapers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/papers?status=pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPapers(response.data);
    } catch (error) {
      console.error('Error fetching papers:', error);
    }
  };

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/admin/applications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApplications(response.data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (paperId, action) => {
    const comment = document.querySelector(`#comment-${paperId}`).value;
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('action', action);
      formData.append('comment', comment);

      await axios.post(`${API}/review/${paperId}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPapers(papers.filter(p => p.id !== paperId));
    } catch (error) {
      console.error('Error reviewing paper:', error);
    }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return <Navigate to="/login" />;
  }

  if (loading) {
    return <div className="page"><div className="container"><p>Cargando...</p></div></div>;
  }

  return (
    <div className="page">
      <main className="container">
        <h2>Panel Administrativo</h2>
        
        <section className="admin-section">
          <h3>Papers Pendientes ({papers.length})</h3>
          {papers.length === 0 ? (
            <p>No hay papers pendientes de revisión.</p>
          ) : (
            <div className="papers-admin">
              {papers.map(paper => (
                <div key={paper.id} className="paper-admin-card">
                  <h4>{paper.title}</h4>
                  <p><strong>Autores:</strong> {paper.authors.join(', ')}</p>
                  <p><strong>Institución:</strong> {paper.institution}</p>
                  <p><strong>Categoría:</strong> {paper.category}</p>
                  <p><strong>Palabras:</strong> {paper.word_count}</p>
                  <p><strong>Resumen:</strong> {paper.abstract}</p>
                  <a href={paper.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                    Ver Paper
                  </a>
                  <textarea
                    id={`comment-${paper.id}`}
                    placeholder="Comentarios para el autor"
                    className="form-textarea"
                    rows="3"
                  />
                  <div className="admin-actions">
                    <button
                      className="btn btn-success"
                      onClick={() => handleReview(paper.id, 'approved')}
                    >
                      Aprobar
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleReview(paper.id, 'rejected')}
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="admin-section">
          <h3>Solicitudes de Revisor ({applications.length})</h3>
          {applications.length === 0 ? (
            <p>No hay solicitudes pendientes.</p>
          ) : (
            <div className="applications-admin">
              {applications.map(app => (
                <div key={app.id} className="application-card">
                  <h4>{app.name}</h4>
                  <p><strong>Email:</strong> {app.email}</p>
                  <p><strong>Institución:</strong> {app.institution}</p>
                  <p><strong>Especialización:</strong> {app.specialization.join(', ')}</p>
                  <p><strong>Experiencia:</strong> {app.experience}</p>
                  <div className="application-actions">
                    <a href={app.cv_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                      Ver CV
                    </a>
                    <a href={app.certificates_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                      Ver Certificados
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/submit" element={<SubmitPaper />} />
            <Route path="/apply-admin" element={<ApplyAdmin />} />
            <Route path="/papers" element={<Papers />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default App;