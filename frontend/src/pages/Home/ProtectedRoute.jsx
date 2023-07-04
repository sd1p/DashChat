import { Navigate } from "react-router-dom";
function ProtectedRoute({ auth, children }) {
  if (!auth) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
export default ProtectedRoute;
