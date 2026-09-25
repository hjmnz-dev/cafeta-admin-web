import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AdminStateProvider } from './store/AdminState';

export default function App() {
  return (
    <AdminStateProvider>
      <RouterProvider router={router} />
    </AdminStateProvider>
  );
}
