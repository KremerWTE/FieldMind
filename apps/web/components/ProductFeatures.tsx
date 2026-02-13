'use client';

import { useEffect, useState } from 'react';

interface ProductFeature {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  keyBenefits: string[];
}

interface FeatureHighlight {
  title: string;
  subtitle: string;
  description: string;
  features: ProductFeature[];
}

const iconMap: { [key: string]: string } = {
  'clipboard-check': '📋',
  'droplet-alert': '💧',
  'route': '🗺️',
  'shield-check': '🛡️',
  'activity': '📊'
};

export default function ProductFeatures() {
  const [featuresData, setFeaturesData] = useState<FeatureHighlight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiUrl}/features`);
        const data = await response.json();
        setFeaturesData(data);
      } catch (error) {
        console.error('Failed to fetch features:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatures();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!featuresData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            {featuresData.title}
          </h1>
          <p className="text-2xl text-gray-600 mb-4">
            {featuresData.subtitle}
          </p>
          <p className="text-lg text-gray-500 max-w-3xl mx-auto">
            {featuresData.description}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {featuresData.features.map((feature, index) => (
            <div
              key={feature.id}
              className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 border border-gray-200"
            >
              <div className="flex items-start mb-4">
                <div className="text-5xl mr-4">
                  {iconMap[feature.icon] || '📱'}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <span className="inline-block px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-100 rounded">
                    {feature.category}
                  </span>
                </div>
              </div>

              <p className="text-gray-600 mb-4">
                {feature.description}
              </p>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Key Benefits:
                </h4>
                <ul className="space-y-2">
                  {feature.keyBenefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-start text-sm text-gray-600">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="bg-blue-600 rounded-lg shadow-xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Property Management?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join leading property managers who use FieldMind to protect their assets
          </p>
          <div className="flex justify-center gap-4">
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
              Start Free Trial
            </button>
            <button className="bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors border border-blue-400">
              Schedule Demo
            </button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">AI-Powered</div>
            <div className="text-gray-600">Automatic Analysis</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">Real-Time</div>
            <div className="text-gray-600">IoT Monitoring</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">Mobile-First</div>
            <div className="text-gray-600">Field Operations</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">Cloud-Based</div>
            <div className="text-gray-600">Always Accessible</div>
          </div>
        </div>
      </div>
    </div>
  );
}
