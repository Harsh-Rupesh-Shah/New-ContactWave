import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Code2, Cpu, Globe2, MessageSquare, Users2, Zap } from 'lucide-react';
import './home.css'; // Import the CSS file

function Home() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/login');
  };

  const handlePrivacyPolicy = () => {
    navigate('/privacy-policy');
  }

  return (
    <div className="home-container">
      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-background">
          <img
            src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80"
            alt="Technology Background"
            className="hero-image"
          />
          <div className="hero-overlay"></div>
        </div>

        <div className="hero-content">
          <div className="hero-title">
            <Zap size={48} className="hero-icon" />
            <h1>Brain Beat Productions</h1>
          </div>
          <p className="hero-description">
            Transforming Ideas into Powerful Digital Solutions
          </p>
          <button onClick={handleGetStarted} className="hero-button">
            Get Started
          </button>
          <button onClick={handlePrivacyPolicy} className="hero-button">
            Privacy Policy
          </button>
        </div>
      </header>

      {/* Services Section */}
      <section className="services-section">
        <div className="services-container">
          <h2>Our Services</h2>
          <div className="services-grid">
            {[
              {
                icon: <Code2 className="service-icon" />,
                title: "Custom Software Development",
                description: "Tailored solutions built with cutting-edge technology"
              },
              {
                icon: <Globe2 className="service-icon" />,
                title: "Web Applications",
                description: "Responsive and scalable web applications"
              },
              {
                icon: <Cpu className="service-icon" />,
                title: "AI & Machine Learning",
                description: "Intelligent solutions for complex problems"
              }
            ].map((service, index) => (
              <div key={index} className="service-card">
                <div className="service-icon-container">{service.icon}</div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section">
        <div className="about-container">
          <div className="about-image-container">
            <img
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80"
              alt="Team collaboration"
              className="about-image"
            />
          </div>
          <div className="about-content">
            <h2>Who We Are</h2>
            <p>
              Brain Beat Productions is a forward-thinking software company dedicated to delivering innovative solutions
              that drive business growth. With our team of expert developers and cutting-edge technology,
              we transform complex challenges into elegant solutions.
            </p>
            <div className="about-features">
              <div className="feature">
                <Users2 className="feature-icon" />
                <span>Expert Team</span>
              </div>
              <div className="feature">
                <MessageSquare className="feature-icon" />
                <span>24/7 Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-section">
        <div className="contact-container">
          <h2>Ready to Get Started?</h2>
          <p>
            Let's discuss how we can help your business grow with our custom software solutions.
          </p>
          <button onClick={handleGetStarted} className="contact-button">
            Contact Us
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-section">
        <div className="footer-container">
          <div className="footer-brand">
            <div className="brand-logo">
              <Zap className="footer-icon" />
              <span>Brain Beat Productions</span>
            </div>
            <p>
              Transforming businesses through innovative software solutions.
            </p>
          </div>
          <div className="footer-links">
            <h3>Services</h3>
            <ul>
              <li>Custom Software</li>
              <li>Web Applications</li>
              <li>AI Solutions</li>
              <li>Cloud Services</li>
            </ul>
          </div>
          <div className="footer-links">
            <h3>Company</h3>
            <ul>
              <li>About Us</li>
              <li>Careers</li>
              <li>Blog</li>
              <li>Contact</li>
            </ul>
          </div>
          <div className="footer-links">
            <h3>Contact</h3>
            <ul>
              <li>info@brainbeat.com</li>
              <li>chintanshah.9389@gmail.com</li>
              <li>+91 9773506778</li>
              <li>+91 9619209708</li>
              <li>2nd Floor, Office No. S 130, Behind Poisar Depot</li>
              <li>Raghuleela Megha Mall, Kandivali West, Mumbai - 400067, Maharashtra</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Brain Beat Productions. All rights reserved. | <a href="/privacy-policy">Privacy Policy</a></p>
        </div>
      </footer>
    </div>
  );
}

export default Home;