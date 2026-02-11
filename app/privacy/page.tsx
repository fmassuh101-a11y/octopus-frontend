'use client'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: February 2026</p>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
            <p className="text-gray-700">We collect: name, email, phone number, profile information, and social media account details when you connect third-party services.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
            <p className="text-gray-700">We use information to provide the Platform, connect creators with brands, process transactions, and send important notices.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Social Media Integration</h2>
            <p className="text-gray-700">When you connect TikTok, Instagram, or other accounts, we only access information necessary to verify your account and display public profile information. We do not post on your behalf without permission.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Information Sharing</h2>
            <p className="text-gray-700">We do not sell your personal information. We share data only with brands/creators you connect with and service providers who assist our operations.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Security</h2>
            <p className="text-gray-700">We implement appropriate security measures to protect your personal information.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Your Rights</h2>
            <p className="text-gray-700">You can access, correct, or delete your data at any time. Contact us to exercise these rights.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Contact Us</h2>
            <p className="text-gray-700">Questions? Contact us at privacy@octopus.app</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <a href="/" className="text-blue-600 hover:underline">← Back to Home</a>
        </div>
      </div>
    </div>
  )
}
