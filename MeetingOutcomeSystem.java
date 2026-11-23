import javax.swing.*;
import java.awt.*;
import java.io.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Beginner-friendly Swing demo for meeting outcome prediction.
 *
 * Demo accounts use password 1234:
 * employee, manager, analyst, admin
 */
public class MeetingOutcomeSystem extends JFrame {
    private static final long serialVersionUID = 1L;
    private static final String USER_FILE = "meeting-users.dat";
    private static final String MEETING_FILE = "meeting-records.dat";
    private static final List<User> users = loadUsers();
    private static final List<Meeting> meetings = loadMeetings();

    private JTextField usernameInput;
    private JPasswordField passwordInput;
    private JComboBox<String> roleInput;
    private User currentUser;

    public MeetingOutcomeSystem() {
        showLogin();
        setTitle("Meeting Outcome Prediction System");
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setSize(900, 650);
        setLocationRelativeTo(null);
    }

    private void showLogin() {
        JPanel panel = new JPanel(new GridBagLayout());
        panel.setBorder(BorderFactory.createEmptyBorder(30, 40, 30, 40));
        GridBagConstraints c = new GridBagConstraints();
        c.insets = new Insets(9, 9, 9, 9);
        c.fill = GridBagConstraints.HORIZONTAL;
        c.gridx = 0;
        c.gridy = 0;
        c.gridwidth = 2;

        JLabel title = new JLabel("Meeting Outcome Prediction System", SwingConstants.CENTER);
        title.setFont(new Font("SansSerif", Font.BOLD, 22));
        panel.add(title, c);

        c.gridy++;
        c.gridwidth = 1;
        panel.add(new JLabel("Username:"), c);
        c.gridx = 1;
        usernameInput = new JTextField(18);
        panel.add(usernameInput, c);

        c.gridy++;
        c.gridx = 0;
        panel.add(new JLabel("Password:"), c);
        c.gridx = 1;
        passwordInput = new JPasswordField(18);
        panel.add(passwordInput, c);

        c.gridy++;
        c.gridx = 0;
        panel.add(new JLabel("Role:"), c);
        c.gridx = 1;
        roleInput = new JComboBox<>(new String[]{"Employee", "Manager", "Analyst", "Admin"});
        panel.add(roleInput, c);

        c.gridy++;
        c.gridx = 0;
        c.gridwidth = 2;
        JButton loginButton = new JButton("Login");
        loginButton.addActionListener(event -> login());
        panel.add(loginButton, c);

        c.gridy++;
        JLabel demo = new JLabel("Demo accounts: employee / manager / analyst / admin (password: 1234)",
                SwingConstants.CENTER);
        panel.add(demo, c);
        setContentPane(panel);
    }

    private void login() {
        String username = usernameInput.getText().trim();
        String password = new String(passwordInput.getPassword());
        String selectedRole = (String) roleInput.getSelectedItem();

        for (User user : users) {
            if (user.username.equalsIgnoreCase(username)
                    && user.password.equals(password)
                    && user.role.equals(selectedRole)) {
                currentUser = user;
                showDashboard();
                return;
            }
        }

        JOptionPane.showMessageDialog(this, "Login details do not match an account.");
    }

    private void showDashboard() {
        JPanel root = new JPanel(new BorderLayout(12, 12));
        root.setBorder(BorderFactory.createEmptyBorder(16, 16, 16, 16));

        JPanel header = new JPanel(new BorderLayout());
        JLabel welcome = new JLabel(currentUser.username + " - " + currentUser.role + " Dashboard");
        welcome.setFont(new Font("SansSerif", Font.BOLD, 21));
        JButton logout = new JButton("Logout");
        logout.addActionListener(event -> {
            currentUser = null;
            showLogin();
            revalidate();
            repaint();
        });
        header.add(welcome, BorderLayout.CENTER);
        header.add(logout, BorderLayout.EAST);
        root.add(header, BorderLayout.NORTH);

        JComponent dashboard = switch (currentUser.role) {
            case "Employee" -> buildMeetingEntryPanel();
            case "Manager" -> buildManagerPanel();
            case "Analyst" -> buildReportsPanel("Analyst Meeting Reports");
            default -> {
                JTabbedPane tabs = new JTabbedPane();
                tabs.addTab("User and Role Management", buildUserManagementPanel(false));
                tabs.addTab("Meeting Reports", buildReportsPanel("All Meeting Outcomes"));
                yield tabs;
            }
        };
        root.add(dashboard, BorderLayout.CENTER);

        setContentPane(root);
        revalidate();
        repaint();
    }

    private JPanel buildMeetingEntryPanel() {
        JPanel panel = new JPanel(new BorderLayout(10, 10));
        JPanel fields = new JPanel(new GridLayout(0, 2, 8, 8));
        fields.setBorder(BorderFactory.createTitledBorder("Enter Meeting Details"));

        JTextField title = new JTextField();
        JTextField objective = new JTextField();
        JTextField agenda = new JTextField();
        JTextField duration = new JTextField("45");
        JTextField participants = new JTextField("8");
        JTextField issues = new JTextField("0");
        JTextField decision = new JTextField();
        JTextField owner = new JTextField();

        addField(fields, "Meeting title:", title);
        addField(fields, "Objective:", objective);
        addField(fields, "Agenda:", agenda);
        addField(fields, "Duration (minutes):", duration);
        addField(fields, "Participants:", participants);
        addField(fields, "Unresolved issues:", issues);
        addField(fields, "Expected decision:", decision);
        addField(fields, "Action owner:", owner);

        JTextArea result = new JTextArea(9, 50);
        result.setEditable(false);
        result.setLineWrap(true);
        result.setWrapStyleWord(true);

        JButton predict = new JButton("Predict Outcome");
        JButton save = new JButton("Predict and Save");
        predict.addActionListener(event -> {
            Meeting meeting = makeMeeting(title, objective, agenda, duration, participants, issues, decision, owner);
            if (meeting != null) result.setText(predictMeeting(meeting));
        });
        save.addActionListener(event -> {
            Meeting meeting = makeMeeting(title, objective, agenda, duration, participants, issues, decision, owner);
            if (meeting == null) return;
            meeting.result = predictMeeting(meeting);
            meetings.add(meeting);
            saveMeetings();
            result.setText(meeting.result + "\n\nMeeting saved.");
        });

        JPanel actions = new JPanel(new FlowLayout(FlowLayout.RIGHT));
        actions.add(predict);
        actions.add(save);
        JPanel resultPanel = new JPanel(new BorderLayout(8, 8));
        resultPanel.setBorder(BorderFactory.createTitledBorder("Prediction"));
        resultPanel.add(new JScrollPane(result), BorderLayout.CENTER);
        resultPanel.add(actions, BorderLayout.SOUTH);

        panel.add(fields, BorderLayout.NORTH);
        panel.add(resultPanel, BorderLayout.CENTER);
        return panel;
    }

    private JPanel buildManagerPanel() {
        JPanel panel = new JPanel(new BorderLayout(10, 10));
        JTabbedPane tabs = new JTabbedPane();
        tabs.addTab("Manage Employees and Analysts", buildUserManagementPanel(true));
        tabs.addTab("Meeting Outcomes", buildReportsPanel("Saved Meeting Outcomes"));
        panel.add(tabs, BorderLayout.CENTER);
        return panel;
    }

    private JPanel buildUserManagementPanel(boolean managerMode) {
        JPanel panel = new JPanel(new BorderLayout(8, 8));
        JPanel addForm = new JPanel(new GridLayout(0, 2, 8, 8));
        addForm.setBorder(BorderFactory.createTitledBorder(
                managerMode ? "Add an Employee or Analyst" : "Add a User"));

        DefaultListModel<String> model = new DefaultListModel<>();
        JTextField name = new JTextField();
        JPasswordField password = new JPasswordField("1234");
        JComboBox<String> role = new JComboBox<>(
                managerMode ? new String[]{"Employee", "Analyst"} :
                        new String[]{"Employee", "Manager", "Analyst", "Admin"});
        addField(addForm, "Username:", name);
        addField(addForm, "Temporary password:", password);
        addField(addForm, "Role:", role);

        JButton add = new JButton("Add User");
        add.addActionListener(event -> {
            String enteredName = name.getText().trim();
            String enteredPassword = new String(password.getPassword());
            String enteredRole = (String) role.getSelectedItem();
            if (enteredName.isEmpty() || enteredPassword.isEmpty()) {
                JOptionPane.showMessageDialog(this, "Enter both a username and password.");
                return;
            }
            if (findUser(enteredName) != null) {
                JOptionPane.showMessageDialog(this, "That username already exists.");
                return;
            }
            users.add(new User(enteredName, enteredPassword, enteredRole));
            saveUsers();
            name.setText("");
            refreshUserList(model, managerMode);
        });
        addForm.add(new JLabel());
        addForm.add(add);

        JList<String> userList = new JList<>(model);
        panel.add(addForm, BorderLayout.NORTH);
        panel.add(new JScrollPane(userList), BorderLayout.CENTER);

        JButton remove = new JButton("Remove Selected User");
        remove.addActionListener(event -> {
            String selection = userList.getSelectedValue();
            if (selection == null) return;
            String selectedName = selection.substring(0, selection.indexOf(" ("));
            User selected = findUser(selectedName);
            if (selected == null || selected.role.equals("Admin") && users.stream().filter(u -> u.role.equals("Admin")).count() <= 1) {
                JOptionPane.showMessageDialog(this, "The last Admin account cannot be removed.");
                return;
            }
            users.remove(selected);
            saveUsers();
            refreshUserList(model, managerMode);
        });
        panel.add(remove, BorderLayout.SOUTH);

        refreshUserList(model, managerMode);
        return panel;
    }

    private void refreshUserList(DefaultListModel<String> model, boolean managerMode) {
        model.clear();
        for (User user : users) {
            if (!managerMode || user.role.equals("Employee") || user.role.equals("Analyst")) {
                model.addElement(user.username + " (" + user.role + ")");
            }
        }
    }

    private JPanel buildReportsPanel(String heading) {
        JPanel panel = new JPanel(new BorderLayout(8, 8));
        JTextArea report = new JTextArea();
        report.setEditable(false);
        report.setFont(new Font("Monospaced", Font.PLAIN, 13));
        report.setText(createMeetingReport());
        panel.setBorder(BorderFactory.createTitledBorder(heading));
        panel.add(new JScrollPane(report), BorderLayout.CENTER);
        JButton refresh = new JButton("Refresh Reports");
        refresh.addActionListener(event -> report.setText(createMeetingReport()));
        panel.add(refresh, BorderLayout.SOUTH);
        return panel;
    }

    private String createMeetingReport() {
        if (meetings.isEmpty()) return "No meeting records have been saved yet.";
        StringBuilder text = new StringBuilder();
        for (Meeting meeting : meetings) {
            text.append("Meeting: ").append(meeting.title)
                    .append("\nDate: ").append(meeting.date)
                    .append("\nOutcome: ").append(meeting.result)
                    .append("\n\n");
        }
        return text.toString();
    }

    private Meeting makeMeeting(JTextField title, JTextField objective, JTextField agenda,
                                JTextField duration, JTextField participants, JTextField issues,
                                JTextField decision, JTextField owner) {
        try {
            Meeting meeting = new Meeting();
            meeting.title = title.getText().trim();
            meeting.objective = objective.getText().trim();
            meeting.agenda = agenda.getText().trim();
            meeting.duration = Integer.parseInt(duration.getText().trim());
            meeting.participants = Integer.parseInt(participants.getText().trim());
            meeting.unresolvedIssues = Integer.parseInt(issues.getText().trim());
            meeting.expectedDecision = decision.getText().trim();
            meeting.actionOwner = owner.getText().trim();
            meeting.date = java.time.LocalDate.now().toString();
            if (meeting.title.isEmpty()) {
                JOptionPane.showMessageDialog(this, "Enter a meeting title.");
                return null;
            }
            return meeting;
        } catch (NumberFormatException exception) {
            JOptionPane.showMessageDialog(this, "Duration, participants, and unresolved issues must be numbers.");
            return null;
        }
    }

    private String predictMeeting(Meeting meeting) {
        int score = 0;
        score += meeting.agenda.length() > 30 ? 15 : -10;
        score += meeting.objective.length() > 30 ? 15 : -10;
        score += meeting.duration >= 20 && meeting.duration <= 60 ? 15 : -10;
        score += meeting.participants <= 8 ? 12 : meeting.participants <= 12 ? 4 : -12;
        score += meeting.unresolvedIssues == 0 ? 10 : -meeting.unresolvedIssues * 8;
        score += meeting.expectedDecision.length() > 20 ? 12 : -8;
        score += meeting.actionOwner.isEmpty() ? -10 : 8;
        score = Math.max(0, Math.min(100, score));

        String outcome = score >= 80 ? "Successful"
                : score >= 60 ? "Partially Successful"
                : score >= 40 ? "Needs Improvement" : "Unsuccessful";
        int confidence = Math.max(55, Math.min(97, Math.round(score * 0.9f)));

        return "Predicted outcome: " + outcome
                + "\nEffectiveness score: " + score + "/100"
                + "\nConfidence: " + confidence + "%"
                + "\n\nThis is a rule-based estimate from the entered meeting details.";
    }

    private void addField(JPanel panel, String label, JComponent input) {
        panel.add(new JLabel(label));
        panel.add(input);
    }

    private User findUser(String username) {
        for (User user : users) {
            if (user.username.equalsIgnoreCase(username)) return user;
        }
        return null;
    }

    private static List<User> loadUsers() {
        List<User> loaded = readList(USER_FILE);
        if (!loaded.isEmpty()) return loaded;
        List<User> defaults = new ArrayList<>();
        defaults.add(new User("employee", "1234", "Employee"));
        defaults.add(new User("manager", "1234", "Manager"));
        defaults.add(new User("analyst", "1234", "Analyst"));
        defaults.add(new User("admin", "1234", "Admin"));
        return defaults;
    }

    private static List<Meeting> loadMeetings() {
        return readList(MEETING_FILE);
    }

    @SuppressWarnings("unchecked")
    private static <T> List<T> readList(String fileName) {
        File file = new File(fileName);
        if (!file.exists()) return new ArrayList<>();
        try (ObjectInputStream input = new ObjectInputStream(new FileInputStream(file))) {
            return (List<T>) input.readObject();
        } catch (IOException | ClassNotFoundException exception) {
            JOptionPane.showMessageDialog(null, "Could not read " + fileName + ": " + exception.getMessage());
            return new ArrayList<>();
        }
    }

    private static void writeList(String fileName, List<?> values) {
        try (ObjectOutputStream output = new ObjectOutputStream(new FileOutputStream(fileName))) {
            output.writeObject(values);
        } catch (IOException exception) {
            JOptionPane.showMessageDialog(null, "Could not save " + fileName + ": " + exception.getMessage());
        }
    }

    private void saveUsers() {
        writeList(USER_FILE, users);
    }

    private void saveMeetings() {
        writeList(MEETING_FILE, meetings);
    }

    private static class User implements Serializable {
        private static final long serialVersionUID = 1L;
        private final String username;
        private final String password;
        private final String role;

        private User(String username, String password, String role) {
            this.username = username;
            this.password = password;
            this.role = role;
        }
    }

    private static class Meeting implements Serializable {
        private static final long serialVersionUID = 1L;
        private String title;
        private String date;
        private String objective;
        private String agenda;
        private int duration;
        private int participants;
        private int unresolvedIssues;
        private String expectedDecision;
        private String actionOwner;
        private String result;
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> new MeetingOutcomeSystem().setVisible(true));
    }
}
