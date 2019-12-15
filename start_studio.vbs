Set service = GetObject ("winmgmts:")

For Each Process In Service.InstancesOf("Win32_Process")
    If Process.Name = "node.exe" Then
        'WScript.Echo "node running"
        WScript.Quit
    End If
Next
' WScript.Echo "node not running"

Set oShell = CreateObject ("Wscript.Shell") 
Dim strArgs
'strArgs = "node --expose-gc server.js > serverjs.log 2>&1"
strArgs = "serverjs.cmd" 
oShell.Run strArgs, 0, false
'strArgs = "node launcher.js > launcher.log 2>&1"
strArgs = "launcherjs.cmd"
oShell.Run strArgs, 0, false


scriptdir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
'WScript.Echo scriptdir
gulpdir=scriptdir+"\server\"
'WScript.Echo gulpdir
'oShell.CurrentDirectory = gulpdir
strArgs = "gulp.cmd"
'strArgs = "gulp serve"
oShell.Run strArgs, 0, false




