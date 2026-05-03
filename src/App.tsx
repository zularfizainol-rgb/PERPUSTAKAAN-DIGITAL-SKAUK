/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/auth-context';
import { Layout } from './components/Layout';
import { Home } from './pages/student/Home';
import { Catalog } from './pages/student/Catalog';
import { ENilamRecord } from './pages/student/ENilamRecord';
import { Ranking } from './pages/student/Ranking';
import { AdminDashboard } from './pages/admin/Dashboard';
import { UploadBook } from './pages/admin/UploadBook';
import { ManageBooks } from './pages/admin/ManageBooks';
import { EditBook } from './pages/admin/EditBook';
import { ReadBook } from './pages/student/Read';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/read/:bookId" element={<ReadBook />} />
            <Route path="/enilam" element={<ENilamRecord />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/upload" element={<UploadBook />} />
            <Route path="/admin/manage" element={<ManageBooks />} />
            <Route path="/admin/manage/edit/:bookId" element={<EditBook />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
