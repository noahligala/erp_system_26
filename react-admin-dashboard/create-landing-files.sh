#!/bin/bash

mkdir -p src/scenes/public
mkdir -p src/components/landing
mkdir -p src/hooks/landing
mkdir -p src/utils/landing

touch src/scenes/public/ApiLandingPage.jsx

touch src/components/landing/LandingHeader.jsx
touch src/components/landing/MobileLandingDrawer.jsx
touch src/components/landing/HeroSection.jsx
touch src/components/landing/BenefitsSection.jsx
touch src/components/landing/ModulesSection.jsx
touch src/components/landing/WorkflowSection.jsx
touch src/components/landing/CurrentUsersCarousel.jsx
touch src/components/landing/PricingSection.jsx
touch src/components/landing/RegistrationForm.jsx
touch src/components/landing/ContactSection.jsx
touch src/components/landing/FaqSection.jsx
touch src/components/landing/LandingFooter.jsx
touch src/components/landing/ScrollToTopButton.jsx

touch src/hooks/landing/usePlans.js
touch src/hooks/landing/useScrollState.js
touch src/hooks/landing/useCarousel.js

touch src/utils/landing/landingData.js
touch src/utils/landing/planUtils.js

echo "Landing page folders and files created successfully."