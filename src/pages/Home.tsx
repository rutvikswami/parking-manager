import { Button } from "@/components/ui/button";
import { MapPin, Car } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <section className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-24 text-center">
          <h1 className="text-5xl font-bold mb-6">Smart Parking Management</h1>
          <p className="text-xl mb-8 opacity-90">
            Efficient zone management with real-time tracking and seamless zone management.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100"
              onClick={() => navigate("/map")}
            >
              <MapPin className="mr-2 h-5 w-5" />
              Find Parking
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-black hover:bg-white hover:text-blue-600"
              onClick={() => navigate("/dashboard")}
            >
              <Car className="mr-2 h-5 w-5" />
              Owner Portal
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-12">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6">
              <MapPin className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Real-time Tracking</h3>
              <p className="text-gray-600">
                Live parking availability with interactive maps
              </p>
            </div>
            <div className="p-6">
              <Car className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Zone Management</h3>
              <p className="text-gray-600">
                Easy creation and management of parking zones
              </p>
            </div>
            <div className="p-6">
              <div className="h-12 w-12 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-white font-bold">24/7</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Always Available</h3>
              <p className="text-gray-600">
                Round-the-clock access to parking services
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">Get Started Today</h2>
            <p className="text-gray-600 mb-8">
              Join our platform for efficient parking management solutions.
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate("/register")}>Sign Up</Button>
              <Button variant="outline" onClick={() => navigate("/login")}>
                Sign In
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
