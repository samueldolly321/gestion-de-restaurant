// Générateur de clés d'activation RestoPilote — petite fenêtre Windows (pour le VENDEUR uniquement).
// Elle appelle scripts/generer-cle.mjs (Node.js), qui signe la clé avec licence-privee/cle-privee.pem
// et l'ajoute au registre licence-privee/cles-emises.csv.
// Compilation : scripts\generateur-cle\build.cmd  →  licence-privee\Generateur-cle-RestoPilote.exe
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows.Forms;

static class Program
{
    [STAThread]
    static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new MainForm());
    }
}

class MainForm : Form
{
    readonly TextBox txtCode = new TextBox();
    readonly TextBox txtClient = new TextBox();
    readonly TextBox txtKey = new TextBox();
    readonly Button btnGenerate = new Button();
    readonly Button btnCopy = new Button();
    readonly Button btnList = new Button();
    readonly Label lblStatus = new Label();
    readonly string projectRoot;

    static readonly Color Red = Color.FromArgb(220, 38, 38);

    public MainForm()
    {
        projectRoot = FindProjectRoot();
        Text = "Générateur de clés — RestoPilote";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        AutoScaleMode = AutoScaleMode.Dpi;
        ClientSize = new Size(560, 420);
        Font = new Font("Segoe UI", 9.5f);
        BackColor = Color.FromArgb(248, 250, 252);
        try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }

        var header = new Panel { Dock = DockStyle.Top, Height = 64, BackColor = Red };
        header.Controls.Add(new Label { Text = "Générateur de clés d'activation", ForeColor = Color.White, Font = new Font("Segoe UI", 14f, FontStyle.Bold), AutoSize = true, Location = new Point(18, 8) });
        header.Controls.Add(new Label { Text = "RestoPilote — réservé au vendeur", ForeColor = Color.FromArgb(254, 226, 226), AutoSize = true, Location = new Point(20, 38) });
        Controls.Add(header);

        AddLabel("1. Code machine du client (affiché dans sa fenêtre d'activation)", 80);
        txtCode.SetBounds(20, 102, 520, 28);
        txtCode.Font = new Font("Consolas", 12f, FontStyle.Bold);
        txtCode.CharacterCasing = CharacterCasing.Upper;
        Controls.Add(txtCode);

        AddLabel("2. Nom du client / du restaurant", 140);
        txtClient.SetBounds(20, 162, 520, 26);
        Controls.Add(txtClient);

        btnGenerate.Text = "Générer la clé";
        btnGenerate.SetBounds(20, 200, 520, 36);
        btnGenerate.BackColor = Red;
        btnGenerate.ForeColor = Color.White;
        btnGenerate.FlatStyle = FlatStyle.Flat;
        btnGenerate.Font = new Font("Segoe UI", 10.5f, FontStyle.Bold);
        btnGenerate.Click += (s, e) => Generate();
        Controls.Add(btnGenerate);
        AcceptButton = btnGenerate;

        AddLabel("3. Clé à envoyer au client (copier-coller)", 248);
        txtKey.SetBounds(20, 270, 520, 70);
        txtKey.Multiline = true;
        txtKey.ReadOnly = true;
        txtKey.BackColor = Color.White;
        txtKey.Font = new Font("Consolas", 9.5f);
        Controls.Add(txtKey);

        btnCopy.Text = "Copier la clé";
        btnCopy.SetBounds(20, 350, 255, 32);
        btnCopy.Enabled = false;
        btnCopy.Click += (s, e) => { Clipboard.SetText(txtKey.Text); SetStatus("Clé copiée dans le presse-papiers.", false); };
        Controls.Add(btnCopy);

        btnList.Text = "Voir les clés déjà émises";
        btnList.SetBounds(285, 350, 255, 32);
        btnList.Click += (s, e) => OpenList();
        Controls.Add(btnList);

        lblStatus.SetBounds(20, 388, 520, 24);
        Controls.Add(lblStatus);

        if (projectRoot == null)
            SetStatus("Dossier du projet introuvable : placez ce programme dans le dossier licence-privee du projet.", true);
    }

    void AddLabel(string text, int y)
    {
        Controls.Add(new Label { Text = text, AutoSize = true, Location = new Point(18, y), ForeColor = Color.FromArgb(71, 85, 105), Font = new Font("Segoe UI", 9f, FontStyle.Bold) });
    }

    void SetStatus(string text, bool error)
    {
        lblStatus.Text = text;
        lblStatus.ForeColor = error ? Red : Color.FromArgb(4, 120, 87);
    }

    // Remonte depuis le dossier de l'exe jusqu'au dossier contenant scripts\generer-cle.mjs.
    static string FindProjectRoot()
    {
        var dir = new DirectoryInfo(AppDomain.CurrentDomain.BaseDirectory);
        for (int i = 0; i < 5 && dir != null; i++, dir = dir.Parent)
            if (File.Exists(Path.Combine(dir.FullName, "scripts", "generer-cle.mjs"))) return dir.FullName;
        return null;
    }

    void Generate()
    {
        txtKey.Text = "";
        btnCopy.Enabled = false;
        if (projectRoot == null) { SetStatus("Dossier du projet introuvable.", true); return; }

        string code = Regex.Replace(txtCode.Text.ToUpperInvariant(), "[^0-9A-F]", "");
        if (code.Length != 16) { SetStatus("Code machine invalide : 16 caractères attendus (ex. 1A2B-3C4D-5E6F-7A8B).", true); return; }
        string client = txtClient.Text.Replace("\"", "").Trim();
        if (client.Length == 0) { SetStatus("Indiquez le nom du client.", true); return; }

        var psi = new ProcessStartInfo
        {
            FileName = "node",
            Arguments = "\"" + Path.Combine(projectRoot, "scripts", "generer-cle.mjs") + "\" " + code + " \"" + client + "\"",
            WorkingDirectory = projectRoot,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8,
        };
        try
        {
            Cursor = Cursors.WaitCursor;
            using (var p = Process.Start(psi))
            {
                string output = p.StandardOutput.ReadToEnd();
                string error = p.StandardError.ReadToEnd();
                p.WaitForExit();
                var m = Regex.Match(output, @"^RP-[A-Z2-7-]+$", RegexOptions.Multiline);
                if (p.ExitCode == 0 && m.Success)
                {
                    txtKey.Text = m.Value.Trim();
                    btnCopy.Enabled = true;
                    SetStatus("Clé générée pour « " + client + " » et enregistrée dans cles-emises.csv.", false);
                }
                else
                {
                    SetStatus("Échec : " + (error + output).Trim().Split('\n')[0], true);
                }
            }
        }
        catch (System.ComponentModel.Win32Exception)
        {
            SetStatus("Node.js est introuvable : installez-le depuis nodejs.org.", true);
        }
        finally { Cursor = Cursors.Default; }
    }

    void OpenList()
    {
        string csv = projectRoot == null ? null : Path.Combine(projectRoot, "licence-privee", "cles-emises.csv");
        if (csv == null || !File.Exists(csv)) { SetStatus("Aucune clé émise pour l'instant.", true); return; }
        Process.Start(new ProcessStartInfo { FileName = csv, UseShellExecute = true });
    }
}
