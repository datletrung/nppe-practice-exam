import { Suspense } from "react";
import Register from "../components/register";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Register />
    </Suspense>
  );
}