# PMO & HR Project Workflow Implementation Plan

Based on your design, we are introducing a highly structured, isolated **Team Building Workflow**! This is brilliant because it bridges PMO and HR perfectly. 

Here is the exact flow we will build into the UI:

## The "Isolated Team" Workflow

### Phase 1: Project Creation & HR Assignment
1. **PMO Creates Project:** PMO sets the project name, code, and deadline.
2. **HR Assignment:** During creation, the PMO *must* select an **HR Representative** to attach to the project. This HR person will oversee the well-being and performance of the people assigned to this specific project.

### Phase 2: Resource Requesting
1. The PMO defines exactly what the project needs to succeed.
2. They input requests like:
   - *2 Frontend Developers*
   - *1 Backend Developer*
   - *1 Full Stack Intern*

### Phase 3: Team Assembly
1. The PMO (or Head PMO) goes to the **Resource Allocation / Team Building** page.
2. They browse the global pool of employees and interns.
3. They select the specific individuals to fill those requested roles.
4. **Result:** The project now has an **Isolated Team** (PMO + HR Rep + Selected Employees). Tasks assigned within this project are strictly limited to this isolated team.

## UI Changes Required

We will need to build this flow into the upcoming pages:

### 1. Update PMO Projects Directory (`/pmo/projects`)
- We need to replace the standard "Create Project" modal with a **Multi-step "Project Wizard"**:
  - *Step 1:* Project Details
  - *Step 2:* Assign HR Rep
  - *Step 3:* Define Resource Requests

### 2. PMO Team Assembly Page (`/pmo/monitoring` or new `/pmo/team`)
- A dedicated interface where the PMO can see their "Requested Roles" (e.g., Need 2 Frontend) and drag-and-drop specific employees from the company directory into the project to fulfill that request.

## Open Questions for You

> [!IMPORTANT]
> **Approval Step:** When the PMO selects an employee to join their project (e.g., assigning John as a Frontend Dev), does that employee get added *immediately*, or does the assigned HR Rep need to click "Approve" before John officially joins the isolated team?

Let me know your thoughts on the Approval Step. Once you confirm, I will immediately start building the **Multi-step Project Wizard**!
