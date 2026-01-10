import React from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicyPage = () => {
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
          <h1 className="text-xl font-bold text-charcoal dark:text-cream">Privacy Policy</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 text-charcoal dark:text-cream">
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-sm text-charcoal-light dark:text-cream-dark mb-6">Last updated: January 09, 2026</p>
          
          <p className="mb-4">This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.</p>
          
          <p className="mb-6">We use Your Personal data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy.</p>

          <h2 className="text-xl font-bold mt-8 mb-4">Interpretation and Definitions</h2>
          
          <h3 className="text-lg font-semibold mt-6 mb-3">Interpretation</h3>
          <p className="mb-4">The words whose initial letters are capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">Definitions</h3>
          <p className="mb-2">For the purposes of this Privacy Policy:</p>
          <ul className="list-disc pl-6 space-y-2 mb-6">
            <li><strong>Account</strong> means a unique account created for You to access our Service or parts of our Service.</li>
            <li><strong>Company</strong> (referred to as either "the Company", "We", "Us" or "Our" in this Agreement) refers to closzit.</li>
            <li><strong>Cookies</strong> are small files that are placed on Your computer, mobile device or any other device by a website.</li>
            <li><strong>Country</strong> refers to: South Korea</li>
            <li><strong>Device</strong> means any device that can access the Service such as a computer, a cell phone or a digital tablet.</li>
            <li><strong>Personal Data</strong> is any information that relates to an identified or identifiable individual.</li>
            <li><strong>Service</strong> refers to the Website.</li>
            <li><strong>Website</strong> refers to closzit, accessible from <a href="https://www.closzit.shop" className="text-gold hover:underline" target="_blank" rel="noopener noreferrer">https://www.closzit.shop</a></li>
            <li><strong>You</strong> means the individual accessing or using the Service.</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-4">Collecting and Using Your Personal Data</h2>
          
          <h3 className="text-lg font-semibold mt-6 mb-3">Types of Data Collected</h3>
          <h4 className="font-semibold mt-4 mb-2">Personal Data</h4>
          <p className="mb-2">While using Our Service, We may ask You to provide Us with certain personally identifiable information that can be used to contact or identify You:</p>
          <ul className="list-disc pl-6 space-y-1 mb-4">
            <li>Email address</li>
            <li>First name and last name</li>
            <li>Usage Data</li>
          </ul>

          <h4 className="font-semibold mt-4 mb-2">Usage Data</h4>
          <p className="mb-4">Usage Data is collected automatically when using the Service. This may include information such as Your Device's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that You visit, the time and date of Your visit, and other diagnostic data.</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">Use of Your Personal Data</h3>
          <p className="mb-2">The Company may use Personal Data for the following purposes:</p>
          <ul className="list-disc pl-6 space-y-2 mb-6">
            <li><strong>To provide and maintain our Service</strong>, including to monitor the usage of our Service.</li>
            <li><strong>To manage Your Account:</strong> to manage Your registration as a user of the Service.</li>
            <li><strong>To contact You:</strong> by email, telephone calls, SMS, or other equivalent forms of electronic communication.</li>
            <li><strong>To manage Your requests:</strong> To attend and manage Your requests to Us.</li>
          </ul>

          <h3 className="text-lg font-semibold mt-6 mb-3">Retention of Your Personal Data</h3>
          <p className="mb-4">The Company will retain Your Personal Data only for as long as is necessary for the purposes set out in this Privacy Policy.</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">Delete Your Personal Data</h3>
          <p className="mb-4">You have the right to delete or request that We assist in deleting the Personal Data that We have collected about You. You may update, amend, or delete Your information at any time by signing in to Your Account.</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">Security of Your Personal Data</h3>
          <p className="mb-4">The security of Your Personal Data is important to Us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure.</p>

          <h2 className="text-xl font-bold mt-8 mb-4">Children's Privacy</h2>
          <p className="mb-4">Our Service does not address anyone under the age of 13. We do not knowingly collect personally identifiable information from anyone under the age of 13.</p>

          <h2 className="text-xl font-bold mt-8 mb-4">Changes to this Privacy Policy</h2>
          <p className="mb-4">We may update Our Privacy Policy from time to time. We will notify You of any changes by posting the new Privacy Policy on this page.</p>

          <h2 className="text-xl font-bold mt-8 mb-4">Contact Us</h2>
          <p className="mb-4">If you have any questions about this Privacy Policy, You can contact us:</p>
          <ul className="list-disc pl-6">
            <li>By email: gnltj123@naver.com</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicyPage;
