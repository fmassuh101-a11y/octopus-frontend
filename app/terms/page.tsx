'use client'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        <p className="text-gray-500 mb-8">Last updated: February 2026</p>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-700">By accessing and using Octopus, you accept and agree to be bound by these Terms of Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p className="text-gray-700">Octopus is an influencer marketing platform that connects content creators with brands and companies for collaboration opportunities.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
            <p className="text-gray-700">You agree to provide accurate information during registration and to keep it updated.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. User Conduct</h2>
            <p className="text-gray-700">You agree not to violate any laws, infringe on rights of others, or submit false information.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Third-Party Integrations</h2>
            <p className="text-gray-700">The Platform integrates with TikTok, Instagram, and YouTube. Your use is also subject to their terms of service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Contact</h2>
            <p className="text-gray-700">Questions? Contact us at support@octopus.app</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <a href="/" className="text-blue-600 hover:underline">← Back to Home</a>
        </div>
      </div>
    </div>
  )
}
