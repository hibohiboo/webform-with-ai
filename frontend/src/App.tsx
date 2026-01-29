import { createBrowserRouter, RouterProvider } from "react-router";
import AdminDownload from "./components/AdminDownload";
import FeedbackForm from "./components/FeedbackForm";
import NotFound from "./components/NotFound";
import ThankYou from "./components/ThankYou";

const router = createBrowserRouter([
  {
    path: "/:appId/form",
    element: <FeedbackForm />,
  },
  {
    path: "/:appId/thank-you",
    element: <ThankYou />,
  },
  {
    path: "/admin",
    element: <AdminDownload />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
