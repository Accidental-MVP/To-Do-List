// Task Class to represent a task
class Task {
    constructor(id, title, description, category, priority, dueDate, recurrence, attachments, status = 'todo') {
        this.id = id;
        this.title = title;
        this.description = description;
        this.category = category;
        this.priority = priority;
        this.dueDate = dueDate;
        this.recurrence = recurrence;
        this.attachments = attachments;
        this.status = status;
        this.createdAt = new Date();
    }
}

// TodoApp Class to manage the application
class TodoApp {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.categories = JSON.parse(localStorage.getItem('categories')) || [
            { name: 'work', color: '#ff4444' },
            { name: 'personal', color: '#4444ff' },
            { name: 'shopping', color: '#44ff44' }
        ];
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.calendar = null;
        
        // Bind the method to preserve context
        this.handleTaskSubmit = this.handleTaskSubmit.bind(this);
        
        this.initializeApp();
    }

    // Initialize the application
    initializeApp() {
        this.initializeElements();
        this.initializeEventListeners();
        this.initializeDragAndDrop();
        this.initializeFlatpickr();
        this.initializeCategories();
        this.loadTasks();
        this.initializeCalendar();
        this.applyTheme();
        this.setupNotifications();
    }

    // Initialize DOM elements
    initializeElements() {
        // Modals
        this.taskModal = document.getElementById('taskModal');
        this.categoryModal = document.getElementById('categoryModal');
        
        // Forms
        this.taskForm = document.getElementById('taskForm');
        this.categoryForm = document.getElementById('categoryForm');
        
        // Buttons
        this.addTaskBtn = document.getElementById('addTaskBtn');
        this.addCategoryBtn = document.getElementById('addCategoryBtn');
        this.themeToggleBtn = document.getElementById('themeToggle');
        
        // Lists
        this.taskLists = document.querySelectorAll('.task-list');
        
        // Search and filters
        this.searchInput = document.getElementById('searchTask');
        this.categoryFilter = document.getElementById('categoryList');
        this.priorityFilter = document.getElementById('priorityFilter');
    }

    // Initialize event listeners
    initializeEventListeners() {
        // Modal controls
        this.addTaskBtn.addEventListener('click', () => {
            this.taskForm.onsubmit = this.handleTaskSubmit; // Reset to default handler
            this.openModal(this.taskModal);
        });
        this.addCategoryBtn.addEventListener('click', () => this.openModal(this.categoryModal));
        
        // Form submissions
        this.categoryForm.addEventListener('submit', (e) => this.handleCategorySubmit(e));
        
        // Close buttons
        document.querySelectorAll('.close').forEach(btn => {
            btn.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')));
        });
        
        // Theme toggle
        this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        
        // Search and filters
        this.searchInput.addEventListener('input', () => this.filterTasks());
        this.categoryFilter.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-btn')) {
                // Remove active class from all buttons
                this.categoryFilter.querySelectorAll('.category-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                // Add active class to clicked button
                e.target.classList.add('active');
                this.filterTasks();
            }
        });
        this.priorityFilter.addEventListener('change', () => this.filterTasks());
    }

    // Initialize drag and drop functionality
    initializeDragAndDrop() {
        this.taskLists.forEach(list => {
            list.addEventListener('dragover', e => {
                e.preventDefault();
                const draggable = document.querySelector('.dragging');
                const afterElement = this.getDragAfterElement(list, e.clientY);
                if (afterElement) {
                    list.insertBefore(draggable, afterElement);
                } else {
                    list.appendChild(draggable);
                }
            });
        });
    }

    // Initialize date picker
    initializeFlatpickr() {
        flatpickr("#taskDueDate", {
            enableTime: true,
            dateFormat: "Y-m-d H:i",
            minDate: "today"
        });
    }

    // Handle task submission
    handleTaskSubmit(e) {
        e.preventDefault();
        
        // Check if we're in edit mode
        if (this.taskForm.onsubmit !== this.handleTaskSubmit) {
            return; // Let the edit handler handle it
        }
        
        // Get form elements directly instead of using FormData
        const title = document.getElementById('taskTitle').value;
        const description = document.getElementById('taskDescription').value;
        const category = document.getElementById('taskCategory').value;
        const priority = document.getElementById('taskPriority').value;
        const dueDate = document.getElementById('taskDueDate').value;
        const recurrence = document.getElementById('taskRecurrence').value;
        const attachments = document.getElementById('taskAttachment').files;

        const task = new Task(
            Date.now().toString(),
            title,
            description,
            category,
            priority,
            dueDate,
            recurrence,
            this.handleFileUpload(attachments)
        );
        
        this.tasks.push(task);
        this.saveTasks();
        this.renderTask(task);
        this.closeModal(this.taskModal);
        this.taskForm.reset();
    }

    // Handle category submission
    handleCategorySubmit(e) {
        e.preventDefault();
        
        // Get form values directly
        const name = document.getElementById('categoryName').value.trim();
        const color = document.getElementById('categoryColor').value;
        
        // Validate category name
        if (!name) {
            alert('Please enter a category name');
            return;
        }
        
        // Check for duplicate category names
        if (this.categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
            alert('This category already exists');
            return;
        }
        
        const category = {
            name: name.toLowerCase(),
            color: color
        };
        
        this.categories.push(category);
        this.saveCategories();
        this.renderCategory(category);
        this.closeModal(this.categoryModal);
        document.getElementById('categoryForm').reset();
    }

    // Handle file uploads
    handleFileUpload(files) {
        const attachments = [];
        if (files) {
            Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    attachments.push({
                        name: file.name,
                        type: file.type,
                        data: e.target.result
                    });
                };
                reader.readAsDataURL(file);
            });
        }
        return attachments;
    }

    // Render a task
    renderTask(task) {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-card';
        taskElement.draggable = true;
        taskElement.dataset.taskId = task.id;
        
        // Add null checks and default values
        taskElement.innerHTML = `
            <span class="priority-badge priority-${task.priority || 'low'}">${task.priority || 'low'}</span>
            <h3>${task.title || 'Untitled Task'}</h3>
            <p>${task.description || 'No description'}</p>
            <div class="task-meta">
                <span class="category">${task.category || 'Uncategorized'}</span>
                <span class="due-date">${task.dueDate ? new Date(task.dueDate).toLocaleString() : 'No due date'}</span>
            </div>
            <div class="task-actions">
                <button class="edit-task-btn" onclick="event.stopPropagation(); app.editTask('${task.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="delete-task-btn" onclick="event.stopPropagation(); app.deleteTask('${task.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        
        const targetList = document.querySelector(`[data-status="${task.status}"]`);
        targetList.appendChild(taskElement);
        
        this.setupDragListeners(taskElement);
    }

    // Setup drag listeners for a task
    setupDragListeners(taskElement) {
        taskElement.addEventListener('dragstart', () => {
            taskElement.classList.add('dragging');
        });
        
        taskElement.addEventListener('dragend', () => {
            taskElement.classList.remove('dragging');
            const newStatus = taskElement.closest('.task-list').dataset.status;
            const taskId = taskElement.dataset.taskId;
            this.updateTaskStatus(taskId, newStatus);
        });
    }

    // Get drag after element
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Filter tasks
    filterTasks() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const selectedCategory = this.categoryFilter.querySelector('.active').dataset.category;
        const selectedPriority = this.priorityFilter.value;
        
        this.tasks.forEach(task => {
            const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
            if (!taskElement) return;
            
            const matchesSearch = task.title.toLowerCase().includes(searchTerm) ||
                                task.description.toLowerCase().includes(searchTerm);
            const matchesCategory = selectedCategory === 'all' || task.category === selectedCategory;
            const matchesPriority = selectedPriority === 'all' || task.priority === selectedPriority;
            
            taskElement.style.display = matchesSearch && matchesCategory && matchesPriority ? 'block' : 'none';
        });
    }

    // Toggle theme
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        localStorage.setItem('theme', this.currentTheme);
    }

    // Apply theme
    applyTheme() {
        document.body.dataset.theme = this.currentTheme;
        this.themeToggleBtn.innerHTML = this.currentTheme === 'light' ? 
            '<i class="fas fa-moon"></i>' : 
            '<i class="fas fa-sun"></i>';
    }

    // Setup notifications
    setupNotifications() {
        if ('Notification' in window) {
            Notification.requestPermission();
            
            setInterval(() => {
                this.checkDueTasks();
            }, 60000); // Check every minute
        }
    }

    // Check for due tasks
    checkDueTasks() {
        const now = new Date();
        this.tasks.forEach(task => {
            const dueDate = new Date(task.dueDate);
            if (dueDate > now && dueDate - now <= 300000) { // 5 minutes before due
                this.showNotification(task);
            }
        });
    }

    // Show notification
    showNotification(task) {
        if (Notification.permission === 'granted') {
            new Notification('Task Due Soon', {
                body: `${task.title} is due in 5 minutes!`,
                icon: '/path/to/icon.png'
            });
        }
    }

    // Save tasks to localStorage
    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    // Save categories to localStorage
    saveCategories() {
        localStorage.setItem('categories', JSON.stringify(this.categories));
    }

    // Load tasks from localStorage
    loadTasks() {
        this.tasks.forEach(task => this.renderTask(task));
    }

    // Modal controls
    openModal(modal) {
        modal.style.display = 'block';
    }

    closeModal(modal) {
        modal.style.display = 'none';
    }

    // Edit task
    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        // Populate form with task data
        document.getElementById('taskTitle').value = task.title || '';
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskCategory').value = task.category || 'work';
        document.getElementById('taskPriority').value = task.priority || 'low';
        document.getElementById('taskDueDate').value = task.dueDate || '';
        document.getElementById('taskRecurrence').value = task.recurrence || 'none';
        
        // Show modal
        this.openModal(this.taskModal);
        
        // Store the original submit handler
        const originalSubmitHandler = this.taskForm.onsubmit;
        
        // Update task on form submit
        this.taskForm.onsubmit = (e) => {
            e.preventDefault();
            
            // Get form values directly
            const title = document.getElementById('taskTitle').value;
            const description = document.getElementById('taskDescription').value;
            const category = document.getElementById('taskCategory').value;
            const priority = document.getElementById('taskPriority').value;
            const dueDate = document.getElementById('taskDueDate').value;
            const recurrence = document.getElementById('taskRecurrence').value;
            
            // Update task object
            Object.assign(task, {
                title,
                description,
                category,
                priority,
                dueDate,
                recurrence
            });
            
            this.saveTasks();
            
            // Remove old task element
            const oldTaskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            if (oldTaskElement) {
                oldTaskElement.remove();
            }
            
            // Render updated task
            this.renderTask(task);
            this.closeModal(this.taskModal);
            this.taskForm.reset();
            
            // Restore original submit handler
            this.taskForm.onsubmit = originalSubmitHandler;
        };
    }

    // Delete task
    deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveTasks();
            document.querySelector(`[data-task-id="${taskId}"]`).remove();
            
            // Refresh calendar events
            if (this.calendar) {
                this.calendar.removeAllEvents();
                this.calendar.addEventSource(this.getCalendarEvents());
            }
        }
    }

    // Update task status
    updateTaskStatus(taskId, newStatus) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = newStatus;
            this.saveTasks();
        }
    }

    // Add this method to render a new category
    renderCategory(category) {
        // Remove the isDefaultCategory check
        const categoryList = document.getElementById('categoryList');
        if (!categoryList) return;

        const categoryBtn = document.createElement('button');
        categoryBtn.className = 'category-btn';
        categoryBtn.dataset.category = category.name;
        categoryBtn.innerHTML = `
            <div class="category-content">
                <span class="category-color" style="background-color: ${category.color}"></span>
                ${category.name}
            </div>
            ${category.name !== 'all' ? `
                <button class="delete-category" onclick="app.deleteCategory('${category.name}', event)">
                    <i class="fas fa-times"></i>
                </button>
            ` : ''}
        `;
        
        // Find the "Add Category" button
        const addCategoryBtn = document.getElementById('addCategoryBtn');
        
        if (addCategoryBtn && addCategoryBtn.parentElement === categoryList) {
            categoryList.insertBefore(categoryBtn, addCategoryBtn);
        } else {
            categoryList.appendChild(categoryBtn);
        }

        // Add to task form category select
        const taskCategorySelect = document.getElementById('taskCategory');
        if (taskCategorySelect) {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            taskCategorySelect.appendChild(option);
        }
    }

    // Also add this method to initialize categories
    initializeCategories() {
        // Clear existing categories except "All"
        const categoryList = document.getElementById('categoryList');
        const allButton = categoryList.querySelector('[data-category="all"]');
        categoryList.innerHTML = '';
        categoryList.appendChild(allButton);

        // Render all categories
        this.categories.forEach(category => {
            this.renderCategory(category);
        });
    }

    // Add the deleteCategory method
    deleteCategory(categoryName, event) {
        // Stop the click event from bubbling up to the category button
        event.stopPropagation();
        
        // Check if category is in use
        const tasksWithCategory = this.tasks.filter(task => task.category === categoryName);
        
        if (tasksWithCategory.length > 0) {
            const confirmDelete = confirm(
                `This category is used by ${tasksWithCategory.length} task(s). ` +
                `Deleting it will set those tasks to 'Uncategorized'. Continue?`
            );
            
            if (!confirmDelete) return;
            
            // Update tasks that use this category
            tasksWithCategory.forEach(task => {
                task.category = 'uncategorized';
                // Update the task in the UI
                const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
                if (taskElement) {
                    const categorySpan = taskElement.querySelector('.category');
                    if (categorySpan) categorySpan.textContent = 'uncategorized';
                }
            });
            
            this.saveTasks();
        }
        
        // Remove category from categories array
        this.categories = this.categories.filter(cat => cat.name !== categoryName);
        this.saveCategories();
        
        // Remove category button from sidebar
        const categoryBtn = event.target.closest('.category-btn');
        if (categoryBtn) categoryBtn.remove();
        
        // Clear and rebuild the task form category select
        const taskCategorySelect = document.getElementById('taskCategory');
        if (taskCategorySelect) {
            taskCategorySelect.innerHTML = ''; // Clear all options
            
            // Add uncategorized option
            const uncategorizedOption = document.createElement('option');
            uncategorizedOption.value = 'uncategorized';
            uncategorizedOption.textContent = 'Uncategorized';
            taskCategorySelect.appendChild(uncategorizedOption);
            
            // Add remaining categories
            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.name;
                option.textContent = category.name;
                taskCategorySelect.appendChild(option);
            });
        }
    }

    // Add this method to initialize the calendar
    initializeCalendar() {
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) return;

        this.calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,dayGridWeek'
            },
            height: '100%',
            events: this.getCalendarEvents(),
            eventClick: (info) => {
                const taskId = info.event.id;
                const task = this.tasks.find(t => t.id === taskId);
                if (task) {
                    this.editTask(taskId);
                }
            },
            eventDidMount: (info) => {
                info.el.title = info.event.title;
            }
        });

        this.calendar.render();
    }

    // Add method to get calendar events from tasks
    getCalendarEvents() {
        return this.tasks
            .filter(task => task.dueDate) // Only tasks with due dates
            .map(task => ({
                id: task.id,
                title: task.title,
                start: task.dueDate,
                backgroundColor: this.getPriorityColor(task.priority),
                borderColor: this.getPriorityColor(task.priority),
                textColor: '#ffffff'
            }));
    }

    // Add method to get color based on priority
    getPriorityColor(priority) {
        const colors = {
            high: '#e53e3e',
            medium: '#d97706',
            low: '#059669'
        };
        return colors[priority] || colors.low;
    }
}

// Initialize the app
const app = new TodoApp();
