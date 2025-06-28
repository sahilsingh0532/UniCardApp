// API Configuration
const API_BASE_URL = 'http://localhost:5000/api'; // Change this to your backend URL
const API_ENDPOINTS = {
    submitForm: '/submit-id-form',
    healthCheck: '/health'
};

// Form validation patterns
const VALIDATION_PATTERNS = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^[6-9]\d{9}$/,
    rollNumber: /^[A-Za-z0-9]{6,15}$/
};

// Loading animation utility
class LoadingManager {
    static show(button) {
        button.disabled = true;
        button.innerHTML = `
            <span class="loading-spinner"></span>
            Processing...
        `;
        button.classList.add('loading');
    }

    static hide(button, originalText = 'Submit Application') {
        button.disabled = false;
        button.innerHTML = originalText;
        button.classList.remove('loading');
    }
}

// Notification system
class NotificationSystem {
    static show(message, type = 'success', duration = 5000) {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${type === 'success' ? '✓' : '⚠'}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto remove after duration
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, duration);

        // Add entrance animation
        setTimeout(() => notification.classList.add('show'), 100);
    }

    static success(message) {
        this.show(message, 'success');
    }

    static error(message) {
        this.show(message, 'error');
    }
}

// Form validation utilities
class FormValidator {
    static validateField(field, value) {
        const errors = [];

        switch (field) {
            case 'fullName':
                if (!value || value.trim().length < 2) {
                    errors.push('Full name must be at least 2 characters long');
                }
                if (value && !/^[a-zA-Z\s.]+$/.test(value)) {
                    errors.push('Full name should only contain letters, spaces, and dots');
                }
                break;

            case 'rollNumber':
                if (!value) {
                    errors.push('Roll number is required');
                } else if (!VALIDATION_PATTERNS.rollNumber.test(value)) {
                    errors.push('Roll number should be 6-15 characters (letters and numbers only)');
                }
                break;

            case 'email':
                if (!value) {
                    errors.push('Email is required');
                } else if (!VALIDATION_PATTERNS.email.test(value)) {
                    errors.push('Please enter a valid email address');
                }
                break;

            case 'phone':
                if (!value) {
                    errors.push('Phone number is required');
                } else if (!VALIDATION_PATTERNS.phone.test(value)) {
                    errors.push('Please enter a valid 10-digit Indian phone number');
                }
                break;

            case 'year':
                if (!value) {
                    errors.push('Please select your year');
                }
                break;

            case 'branch':
                if (!value) {
                    errors.push('Please select your branch');
                }
                break;
        }

        return errors;
    }

    static validateForm(formData) {
        const errors = {};
        const fields = ['fullName', 'rollNumber', 'email', 'phone', 'year', 'branch'];

        fields.forEach(field => {
            const fieldErrors = this.validateField(field, formData[field]);
            if (fieldErrors.length > 0) {
                errors[field] = fieldErrors;
            }
        });

        return errors;
    }

    static displayFieldError(fieldName, errors) {
        const field = document.getElementById(fieldName);
        const errorContainer = document.getElementById(`${fieldName}Error`);
        
        if (errors && errors.length > 0) {
            field.classList.add('error');
            if (errorContainer) {
                errorContainer.textContent = errors[0];
                errorContainer.style.display = 'block';
            }
        } else {
            field.classList.remove('error');
            if (errorContainer) {
                errorContainer.style.display = 'none';
            }
        }
    }

    static clearAllErrors() {
        const errorElements = document.querySelectorAll('.error-message');
        const fieldElements = document.querySelectorAll('.error');
        
        errorElements.forEach(el => el.style.display = 'none');
        fieldElements.forEach(el => el.classList.remove('error'));
    }
}

// API communication class
class APIClient {
    static async makeRequest(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const finalOptions = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, finalOptions);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return { success: true, data };
        } catch (error) {
            console.error('API Request failed:', error);
            return { 
                success: false, 
                error: error.message || 'Network error occurred' 
            };
        }
    }

    static async submitIDForm(formData) {
        return await this.makeRequest(API_ENDPOINTS.submitForm, {
            method: 'POST',
            body: JSON.stringify(formData)
        });
    }

    static async healthCheck() {
        return await this.makeRequest(API_ENDPOINTS.healthCheck);
    }
}

// File upload handler
class FileUploadHandler {
    static setupPhotoUpload() {
        const photoInput = document.getElementById('photo');
        const uploadArea = document.querySelector('.upload-area');
        const fileName = document.querySelector('.file-name');

        if (!photoInput || !uploadArea) return;

        // Handle file selection
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFileSelection(file, fileName, uploadArea);
            }
        });

        // Handle drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            
            const file = e.dataTransfer.files[0];
            if (file) {
                photoInput.files = e.dataTransfer.files;
                this.handleFileSelection(file, fileName, uploadArea);
            }
        });
    }

    static handleFileSelection(file, fileName, uploadArea) {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            NotificationSystem.error('Please upload only JPG, JPEG, or PNG images');
            return;
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            NotificationSystem.error('File size should be less than 5MB');
            return;
        }

        // Update UI
        if (fileName) {
            fileName.textContent = file.name;
            fileName.style.display = 'block';
        }
        uploadArea.classList.add('file-selected');
    }

    static async convertFileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}

// Main form handler
class IDFormHandler {
    static init() {
        this.setupEventListeners();
        this.setupRealTimeValidation();
        FileUploadHandler.setupPhotoUpload();
        this.checkBackendConnection();
    }

    static setupEventListeners() {
        const form = document.getElementById('idCardForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Setup smooth scrolling for navigation
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    static setupRealTimeValidation() {
        const fields = ['fullName', 'rollNumber', 'email', 'phone', 'year', 'branch'];
        
        fields.forEach(fieldName => {
            const field = document.getElementById(fieldName);
            if (field) {
                field.addEventListener('blur', () => {
                    const errors = FormValidator.validateField(fieldName, field.value);
                    FormValidator.displayFieldError(fieldName, errors);
                });

                field.addEventListener('input', () => {
                    // Clear error on input
                    FormValidator.displayFieldError(fieldName, []);
                });
            }
        });
    }

    static async checkBackendConnection() {
        const result = await APIClient.healthCheck();
        if (!result.success) {
            console.warn('Backend connection check failed:', result.error);
            // Optionally show a warning to the user
        }
    }

    static async handleFormSubmit(e) {
        e.preventDefault();
        
        const submitButton = document.querySelector('.submit-btn');
        const form = e.target;
        
        try {
            // Clear previous errors
            FormValidator.clearAllErrors();
            
            // Collect form data
            const formData = await this.collectFormData(form);
            
            // Validate form
            const validationErrors = FormValidator.validateForm(formData);
            
            if (Object.keys(validationErrors).length > 0) {
                this.displayValidationErrors(validationErrors);
                return;
            }
            
            // Show loading state
            LoadingManager.show(submitButton);
            
            // Submit to backend
            const result = await APIClient.submitIDForm(formData);
            
            if (result.success) {
                this.handleSubmissionSuccess(result.data, form);
            } else {
                this.handleSubmissionError(result.error);
            }
            
        } catch (error) {
            console.error('Form submission error:', error);
            this.handleSubmissionError('An unexpected error occurred. Please try again.');
        } finally {
            LoadingManager.hide(submitButton);
        }
    }

    static async collectFormData(form) {
        const formData = new FormData(form);
        const data = {};
        
        // Collect text fields
        for (let [key, value] of formData.entries()) {
            if (key !== 'photo') {
                data[key] = value.trim();
            }
        }
        
        // Handle photo upload
        const photoInput = document.getElementById('photo');
        if (photoInput && photoInput.files[0]) {
            try {
                data.photo = await FileUploadHandler.convertFileToBase64(photoInput.files[0]);
                data.photoName = photoInput.files[0].name;
            } catch (error) {
                console.error('Error processing photo:', error);
                throw new Error('Failed to process uploaded photo');
            }
        }
        
        // Add timestamp
        data.submissionTime = new Date().toISOString();
        
        return data;
    }

    static displayValidationErrors(errors) {
        Object.keys(errors).forEach(fieldName => {
            FormValidator.displayFieldError(fieldName, errors[fieldName]);
        });
        
        // Scroll to first error
        const firstErrorField = document.querySelector('.error');
        if (firstErrorField) {
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstErrorField.focus();
        }
        
        NotificationSystem.error('Please fix the errors in the form before submitting.');
    }

    static handleSubmissionSuccess(data, form) {
        NotificationSystem.success(
            `Application submitted successfully! Your reference ID is: ${data.referenceId || 'N/A'}`
        );
        
        // Reset form
        form.reset();
        FormValidator.clearAllErrors();
        
        // Reset file upload UI
        const uploadArea = document.querySelector('.upload-area');
        const fileName = document.querySelector('.file-name');
        if (uploadArea) uploadArea.classList.remove('file-selected');
        if (fileName) fileName.style.display = 'none';
        
        // Optionally redirect or show success page
        setTimeout(() => {
            if (confirm('Would you like to submit another application?')) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                window.location.href = 'index.html';
            }
        }, 3000);
    }

    static handleSubmissionError(errorMessage) {
        NotificationSystem.error(
            `Submission failed: ${errorMessage}. Please try again or contact support.`
        );
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    IDFormHandler.init();
});

// Add CSS for notifications and loading states
const additionalCSS = `
/* Notification Styles */
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    max-width: 400px;
    z-index: 10000;
    transform: translateX(100%);
    transition: transform 0.3s ease-in-out;
}

.notification.show {
    transform: translateX(0);
}

.notification-content {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.notification-success .notification-content {
    background: linear-gradient(135deg, #00b894, #00a085);
}

.notification-error .notification-content {
    background: linear-gradient(135deg, #e74c3c, #c0392b);
}

.notification-icon {
    margin-right: 8px;
    font-size: 16px;
}

.notification-message {
    flex: 1;
    margin-right: 8px;
}

.notification-close {
    background: none;
    border: none;
    color: white;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;
}

/* Loading Spinner */
.loading-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid #ffffff40;
    border-top: 2px solid #ffffff;
    border-radius: 50%;
    display: inline-block;
    animation: spin 1s linear infinite;
    margin-right: 8px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.submit-btn.loading {
    opacity: 0.8;
    cursor: not-allowed;
}

/* Error States */
.form-group input.error,
.form-group select.error {
    border-color: #e74c3c;
    box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.2);
}

.error-message {
    display: none;
    color: #e74c3c;
    font-size: 12px;
    margin-top: 4px;
}

/* Upload Area States */
.upload-area.drag-over {
    border-color: #3498db;
    background-color: rgba(52, 152, 219, 0.1);
}

.upload-area.file-selected {
    border-color: #00b894;
    background-color: rgba(0, 184, 148, 0.1);
}

.file-name {
    display: none;
    margin-top: 8px;
    color: #00b894;
    font-size: 14px;
    font-weight: 500;
}

/* Responsive Notifications */
@media (max-width: 768px) {
    .notification {
        right: 10px;
        left: 10px;
        max-width: none;
        transform: translateY(-100%);
    }
    
    .notification.show {
        transform: translateY(0);
    }
}
`;

// Inject additional CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalCSS;
document.head.appendChild(styleSheet);

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        IDFormHandler,
        APIClient,
        FormValidator,
        NotificationSystem,
        FileUploadHandler,
        LoadingManager
    };
}