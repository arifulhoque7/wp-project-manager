export const Selectors = {
  login: {
    basicLogin: {
      loginEmailField: '#user_login',
      loginPasswordField: '#user_pass',
      rememberMeField: '#rememberme',
      loginButton: '#wp-submit',
    },
    validateBasicLogin: {
      dashboardLoaded: '#wpadminbar',
    },
  },

  wpAdmin: {
    adminMenuPM: '#toplevel_page_pm_projects',
    adminMenuPMLabel: '#toplevel_page_pm_projects .wp-menu-name',
  },

  pmRoot: '#wedevs-project-manager',

  pmDashboard: {
    appReady: '#wedevs-project-manager',
    projectsPageTitle: 'text=Projects',
    newProjectButton: 'button:has-text("New Project"), [data-test="new-project"]',
    myTasksLink: 'a:has-text("My Tasks")',
  },

  project: {
    modalRoot: '[role="dialog"], .pm-modal',
    titleInput: 'input[placeholder="Enter project name"], input[name="title"], input[placeholder*="Project" i]',
    descriptionInput: 'textarea[name="description"], textarea[placeholder*="Description" i]',
    createSubmit: 'button:has-text("Create Project"), button:has-text("Save")',
    cardByTitle: (title: string) => `text=${title}`,
    // Each project card is a `.group` container whose h3 carries the title.
    cardRoot: (title: string) => `div.group:has(h3:has-text("${title}"))`,
    starButton: (title: string) =>
      `div.group:has(h3:has-text("${title}")) button:has(svg.lucide-star)`,
    menuTrigger: (title: string) =>
      `div.group:has(h3:has-text("${title}")) button:has(svg.lucide-ellipsis)`,
    // Radix menu content is portaled; scope to it so WP admin-bar menuitems don't collide.
    menuItem: (label: string) => `[data-radix-menu-content] [role="menuitem"]:has-text("${label}")`,
    confirmDelete: '[role="dialog"] button:has-text("Delete")',
    searchInput: 'input[placeholder*="Search" i]',
  },

  taskList: {
    newButton: 'button:has-text("New List"), button:has-text("New Task List"), button:has-text("Add Task List")',
    titleInput: 'input[placeholder="Task list name"], input[placeholder*="list name" i], input[name="list_title"]',
    descriptionInput: 'textarea[placeholder*="Description" i]',
    saveButton: 'button:has-text("Add List"):not([disabled]), button:has-text("Save List"), button:has-text("Save")',
    byTitle: (title: string) => `text=${title}`,
    // A list section header is a flex div whose direct-child h3 carries the title.
    menuTrigger: (title: string) =>
      `div:has(> h3:has-text("${title}")) button:has(svg.lucide-ellipsis)`,
    deleteMenuItem: '[data-radix-menu-content] [role="menuitem"]:has-text("Delete")',
    // Delete goes through a useConfirm AlertDialog with a "Confirm" action.
    confirmDelete: '[role="alertdialog"] button:has-text("Confirm")',
  },

  task: {
    quickAddReveal: 'button:has-text("Add a task")',
    quickAddInput: 'input[placeholder*="Task name" i]',
    quickAddSubmit: 'button:has-text("Add Task")',
    byTitle: (title: string) => `text=${title}`,
    // A task row is a `.group` flex div whose direct-child title button carries the title.
    rowByTitle: (title: string) => `div.group:has(> button:has-text("${title}"))`,
    rowTitleButton: (title: string) => `div.group > button:has-text("${title}")`,
    detailSheet: '[role="dialog"]',
    // Detail sheet — Dates: click "Set dates", pick a Due date, Save (no native date input)
    setDatesButton: '[role="dialog"] button:has-text("Set dates"), [role="dialog"] button:has-text("→")',
    dueDateTrigger: '[role="dialog"] button:has-text("Due")',
    calendarToday: 'button:has-text("Today")',
    datesSaveButton: '[role="dialog"] button:has-text("Save")',
    // Detail sheet — Assignees: click "Add", search, pick member from dropdown
    addAssigneeButton: '[role="dialog"] button:has-text("Add")',
    assigneeSearchInput: '[role="dialog"] input[placeholder*="Search members" i]',
    assigneeOption: (name: string) =>
      `[role="dialog"] [class*="overflow-y-auto"] button:has-text("${name}")`,
    // Detail sheet — Description: Add/Edit button beside the Description heading, then Tiptap editor
    descEditButton: '[role="dialog"] div:has(> h4:has-text("Description")) > button',
    descEditor: '[role="dialog"] .ProseMirror',
    descSaveButton: '[role="dialog"] button:has-text("Save")',
    // Detail sheet — Milestone field: label row anchored on the milestone icon.
    // Dropdown is inline (not portaled); options live inside the same row.
    milestoneRow: '[role="dialog"] div.flex.items-center:has(> div:has(svg.lucide-milestone))',
    milestoneTrigger:
      '[role="dialog"] div.flex.items-center:has(> div:has(svg.lucide-milestone)) button',
    milestoneOption: (title: string) =>
      `[role="dialog"] div.flex.items-center:has(> div:has(svg.lucide-milestone)) button:has-text("${title}")`,
    // Row dropdown menu items (rendered in the portal as menuitems)
    menuItem: (label: string) => `[role="menuitem"]:has-text("${label}")`,
    // Legacy aliases kept for other specs
    checkbox: 'input[type="checkbox"]',
    detailModal: '[role="dialog"]',
    descriptionEditor: '[role="dialog"] .ProseMirror, .ProseMirror, [contenteditable="true"]',
    saveButton: 'button:has-text("Save")',
    attachFileInput: 'input[type="file"]',
  },

  milestone: {
    newButton: 'button:has-text("New Milestone"), button:has-text("Add Milestone")',
    titleInput: 'input[placeholder*="Milestone title" i], input[placeholder*="Milestone" i]',
    // Description is a Tiptap RichTextEditor inside the create dialog, not a textarea.
    descriptionEditor: '[role="dialog"] .ProseMirror',
    saveButton:
      'button:has-text("Create Milestone"), button:has-text("Save Milestone"), button:has-text("Save")',
    byTitle: (title: string) => `text=${title}`,
    menuTrigger: 'button[aria-label="More actions"]',
    markComplete: '[data-radix-menu-content] [role="menuitem"]:has-text("Mark Complete")',
  },

  discussion: {
    newButton: 'button:has-text("New Discussion"), button:has-text("New Message")',
    titleInput:
      'input[placeholder*="message title" i], input[placeholder*="discussion" i], input[placeholder*="Title" i]',
    bodyEditor: '.ProseMirror, [contenteditable="true"]',
    submitButton:
      'button:has-text("Add Message"), button:has-text("Post"), button:has-text("Submit")',
    byTitle: (title: string) => `text=${title}`,
    // Comment box on the discussion detail page: Tiptap editor + a Send icon button.
    commentInput: '.ProseMirror, [contenteditable="true"]',
    commentSubmit: 'button:has(svg.lucide-send)',
    mentionTrigger: '@',
  },

  category: {
    newButton: 'button:has-text("New Category"), button:has-text("Add Category")',
    newInput:
      '[role="dialog"] input[placeholder*="Category name" i], input[placeholder*="Category name" i], input[name="category"]',
    submit:
      '[role="dialog"] button:has-text("Create Category"), [role="dialog"] button:has-text("Save")',
    byName: (name: string) => `text=${name}`,
  },

  settings: {
    emailTab: 'button:has-text("Email")',
    taskTypesTab: 'button:has-text("Task Types")',
    aiTab: 'button:has-text("AI Settings")',
    saveButton: 'button:has-text("Save Changes"), button:has-text("Save")',
    // General tab Save is disabled until the form is dirty — a Switch makes it dirty.
    generalSwitch: '[role="switch"]',
    // AI tab uses a shadcn Select (not native) and a Tiptap-free Input#ai_api_key.
    aiApiKeyInput: '#ai_api_key',
    aiChangeKeyButton: 'button[title="Change API Key"]',
  },

  myTasks: {
    badge: '.update-plugins, span.count',
    taskRow: '[data-test="my-task-row"], .pm-task-row',
  },

  // AdminRoute Forbidden card — shown when a non-admin/non-manager hits an
  // admin-only route (/settings, /categories, /importtools, /modules).
  permissions: {
    forbiddenHeading: '#wedevs-project-manager :text("Access denied")',
    forbiddenBody: '#wedevs-project-manager :text("You do not have permission")',
  },

  proTeaser: {
    upgradeBanner: 'text=/Upgrade to Pro|Go Premium|Pro Version|Unlock Premium/i',
    upgradeModal: '[role="dialog"]:has-text("Pro"), .pm-upgrade-modal, [class*="premium" i][role="dialog"]',
    premiumMenuLink: 'a[href*="#/premium"]',
  },

  kanban: {
    boardHeading: 'h2:has-text("Kanban Board")',
    addSectionInput: 'input[placeholder*="Add new section" i]',
    columnTitle: 'input[placeholder*="Add new section" i]',
    columnByTitle: (title: string) => `text=${title}`,
    addTaskButton: 'button:has-text("Add task")',
    addTaskInput: 'textarea[placeholder*="needs to be done" i]',
  },

  overview: {
    subtitle: 'text=Project Overview',
    progressHeading: 'h3:has-text("Overall Progress")',
    teamMembersHeading: 'h3:has-text("Team Members")',
    statByLabel: (label: string) => `text=${label}`,
  },

  activity: {
    heading: 'h1:has-text("Activities")',
    // NB: these feed into validateAny() which comma-joins them into ONE CSS
    // locator, so every entry must be valid CSS — Playwright's `text=` engine
    // syntax is not (it throws mid-list). Use the `:text()` CSS pseudo instead.
    subtitle: ':text("All changes and updates in this project")',
    proBadge: ':text("Pro Required")',
    upsellHeading: ':text("Project Activities")',
    emptyState: 'h3:has-text("No activities yet")',
    // Licensed feed renders stat cards (Total/Today/Created/Updated) + rows;
    // the stat card class is the stable "content region rendered" marker.
    item: '.rounded-xl.border.bg-card, [data-test="activity-item"], .pm-activity-item',
    // Pro active + unlicensed gates the activity feed behind the License page.
    licenseGate: 'h2:has-text("License"), h1:has-text("License")',
  },

  search: {
    trigger:
      'button:has-text("Search projects and tasks"), button:has-text("Search..."), button:has-text("Search")',
    input: '[role="dialog"] input[placeholder*="Search projects" i]',
    dialog: '[role="dialog"]:has(input[placeholder*="Search projects" i])',
    groupHeading: (name: string) => `[role="dialog"] :text("${name}")`,
    resultByTitle: (title: string) =>
      `[role="dialog"] [cmdk-item]:has-text("${title}"), [role="dialog"] [role="option"]:has-text("${title}")`,
    empty: '[role="dialog"] :text("No results found")',
  },

  taskComment: {
    sheet: '[role="dialog"]',
    editor: '[role="dialog"] .ProseMirror, [role="dialog"] [contenteditable="true"]',
    submitButton: '[role="dialog"] button:has-text("Add Comment")',
    byText: (text: string) => `[role="dialog"] :text("${text}")`,
  },
};
