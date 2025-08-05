## GitHub Setup

### **1. Download and install Github desktop**
https://desktop.github.com/download/

### **2. Click File (Top Left) and 'Clone Repository', navigate to our one: GitHub\COMP602-Tilt and select your folder destination to clone (desktop or documents)**

### **3. Select Branch: Currently there's only main**

### **3. Open in Visual Studio Code**


## **Installation Steps**

### **1. Install Node.js:**
React development relies on Node.js and its package manager, npm. If you don't have Node.js installed, download and install the LTS (Long Term Support) version from the official Node.js website. Verify the installation by opening your terminal or command prompt and running:


  ```bash
  node -v
  npm -v
  ```

This should display the installed versions of Node.js and npm.

### **2. Navigate to Your Project and Install Dependencies:**
Change into your newly created project directory:

Code

  ```bash
  cd my-react-app
  ```

OR

Open Folder in VS Code

### **3. Then, install the necessary project dependencies:**

  ```bash 
  npm install
  ```

### **4. Start the Development Server:**

Finally, start the local development server to run your React application

  ```bash 
  npm run dev
  ```

This command will typically open your React app in your default browser at a local address (e.g., http://localhost:5173). You can stop the server by pressing Ctrl + C in the terminal.



## **Formatting (OPTIONAL, format on save helps with readability)**
The last thing you want to do when sharing your code with another contributor is get into a discussion about tabs vs spaces! Fortunately, Prettier will clean up your code by reformatting it to conform to preset, configurable rules. Run Prettier, and all your tabs will be converted to spaces—and your indentation, quotes, etc will also all be changed to conform to the configuration. In the ideal setup, Prettier will run when you save your file, quickly making these edits for you.

You can install the Prettier extension in VSCode by following these steps:

1. Launch VS Code
2. Use Quick Open (press Ctrl/Cmd+P)
3. Paste in ext install esbenp.prettier-vscode
4. Press Enter
5. Formatting on save 
6. Ideally, you should format your code on every save. VS Code has settings for this!

7. In VS Code, press CTRL/CMD + SHIFT + P.
8. Type “settings”
9. Hit Enter
10. In the search bar, type “format on save”
11. Be sure the “format on save” option is ticked!

If your ESLint preset has formatting rules, they may conflict with Prettier. We recommend disabling all formatting rules in your ESLint preset using eslint-config-prettier so that ESLint is only used for catching logical mistakes. If you want to enforce that files are formatted before a pull request is merged, use prettier --check for your continuous integration.

