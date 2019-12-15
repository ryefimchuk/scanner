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
strArgs = "node --expose-gc server.js >>serverjs.log"
oShell.Run strArgs, 0, false
strArgs = "node launcher.js >>launcher.log"
oShell.Run strArgs, 0, false


scriptdir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
'WScript.Echo scriptdir
gulpdir=scriptdir+"\server\"
'WScript.Echo gulpdir
'oShell.CurrentDirectory = gulpdir
strArgs = "gulp.cmd"
'strArgs = "gulp serve"
oShell.Run strArgs, 0, false




function readFromRegistry (strRegistryKey, strDefault)
    Dim WSHShell, value



    On Error Resume Next
    Set WSHShell = CreateObject ("WScript.Shell")
    value = WSHShell.RegRead (strRegistryKey)

    if err.number <> 0 then
        readFromRegistry= strDefault
    else
        readFromRegistry=value
    end if

    set WSHShell = nothing
end function

function OpenWithChrome(strURL)
    Dim strChrome
    Dim WShellChrome



    strChrome = readFromRegistry ( "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe\Path", "") 
    if (strChrome = "") then
        strChrome = "chrome.exe"
    else
        strChrome = strChrome & "\chrome.exe"
    end if
    Set WShellChrome = CreateObject("WScript.Shell")
    strChrome = """" & strChrome & """" & " " & strURL
    WShellChrome.Run strChrome, 1, false
end function

'OpenWithChrome "http://localhost:3000/#/"