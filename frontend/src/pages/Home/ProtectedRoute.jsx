import { Navigate } from "react-router-dom";
function ProtectedRoute({ children, user }) {
  if (!user?._id) {
    return <Navigate to="/login" replace />;
  } else {
    return children;
  }
}
export default ProtectedRoute;
