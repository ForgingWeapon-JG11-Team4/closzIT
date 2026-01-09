import React from 'react';
import { useNavigate } from 'react-router-dom';

const TermsOfServicePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream dark:bg-[#1A1918]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-cream/80 dark:bg-[#1A1918]/80 backdrop-blur-md border-b border-gold-light/20">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gold-light/20 transition-colors"
          >
            <span className="material-symbols-rounded text-2xl text-charcoal dark:text-cream">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold text-charcoal dark:text-cream">Terms of Service</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 text-charcoal dark:text-cream">
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-sm text-charcoal-light dark:text-cream-dark mb-6">Last updated: January 09, 2026</p>
          
          <p className="mb-6">Please read these Terms of Service ("Terms") carefully before using the closzit service ("Service") operated by closzit ("Company", "we", "us", or "our").</p>

          <h2 className="text-xl font-bold mt-8 mb-4">1. Agreement to Terms</h2>
          <p className="mb-4">By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Service.</p>

          <h2 className="text-xl font-bold mt-8 mb-4">2. Description of Service</h2>
          <p className="mb-4">CloszIT is a digital wardrobe management and outfit recommendation service. We provide AI-powered styling suggestions, virtual try-on features, and wardrobe organization tools to help you manage your clothing and discover new outfit combinations.</p>

          <h2 className="text-xl font-bold mt-8 mb-4">3. User Accounts</h2>
          <p className="mb-2">When you create an account with us, you must provide accurate and complete information. You are responsible for:</p>
          <ul className="list-disc pl-6 space-y-1 mb-4">
            <li>Maintaining the security of your account and password</li>
            <li>All activities that occur under your account</li>
            <li>Notifying us immediately of any unauthorized use</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-4">4. User Content</h2>
          <p className="mb-4">Our Service allows you to upload, store, and share content including photos and personal information. You retain ownership of any content you submit. By uploading content, you grant us a license to use, modify, and display such content for the purpose of providing the Service.</p>

          <h2 className="text-xl font-bold mt-8 mb-4">5. Prohibited Uses</h2>
          <p className="mb-2">You agree not to use the Service:</p>
          <ul className="list-disc pl-6 space-y-1 mb-4">
            <li>For any unlawful purpose or to promote illegal activities</li>
            <li>To harass, abuse, or harm another person</li>
            <li>To impersonate any person or entity</li>
            <li>To interfere with or disrupt the Service or servers</li>
            <li>To attempt to gain unauthorized access to any part of the Service</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-4">6. Credits and Virtual Currency</h2>
          <p className="mb-4">The Service may include virtual credits that can be used for certain features. Credits have no monetary value and cannot be exchanged for cash. We reserve the right to modify credit pricing and availability at any time.</p>

          <h2 className="text-xl font-bold mt-8 mb-4">7. Intellectual Property</h2>
          <p className="mb-4">The Service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of closzit. Our trademarks may not be used without prior written consent.</p>

          <h2 className="text-xl font-bold mt-8 mb-4">8. Disclaimer of Warranties</h2>
          <p className="mb-4">The Service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind. We do not guarantee that the Service will be uninterrupted, secure, or error-free. AI-generated recommendations are suggestions only and should not be solely relied upon.</p>

          <h2 className="text-xl font-bold mt-8 mb-4">9. Limitation of Liability</h2>
          <p className="mb-4">To the maximum extent permitted by law, closzit shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service.</p>

          <h2 className="text-xl font-bold mt-8 mb-4">10. Termination</h2>
          <p className="mb-4">We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including breach of these Terms. Upon termination, your right to use the Service will cease immediately.</p>

          <h2 className="text-xl font-bold mt-8 mb-4">11. Governing Law</h2>
          <p className="mb-4">These Terms shall be governed by and construed in accordance with the laws of Republic of Korea, without regard to its conflict of law provisions.</p>

          <h2 className="text-xl font-bold mt-8 mb-4">12. Changes to Terms</h2>
          <p className="mb-4">We reserve the right to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms on this page. Your continued use of the Service after any changes constitutes acceptance of the new Terms.</p>

          <h2 className="text-xl font-bold mt-8 mb-4">13. Contact Us</h2>
          <p className="mb-4">If you have any questions about these Terms, please contact us:</p>
          <ul className="list-disc pl-6">
            <li>By email: gnltj123@naver.com</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default TermsOfServicePage;
