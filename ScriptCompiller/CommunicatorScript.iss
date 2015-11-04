
#define   Name       "OfficeCommunicator"

#define   Version    "0.0.7"

#define   Publisher  "OfficeCommunicator"

#define   URL        "http://www.Studay.com"

#define   ExeName    "Communicator.exe"

[Setup]

AppId={{6050C92A-6AAA-4BD9-8661-9F10E9C4441F}

AppName={#Name}
AppVersion={#Version}
AppPublisher={#Publisher}
AppPublisherURL={#URL}
AppSupportURL={#URL}
AppUpdatesURL={#URL}

DefaultDirName={pf}\{#Name}



DefaultGroupName={#Name}

OutputDir=C:\Users\testcompilation\test-setup
OutputBaseFileName=test-setup


Compression=lzma
SolidCompression=yes

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]

Source: "C:\Users\proko_000\Documents\Visual Studio 2015\Projects\Communicator\Communicator\bin\Debug\Communicator.exe"; DestDir: "{app}"; Flags: ignoreversion

Source: "C:\Users\testcompilation\dotNetFx40_Full_x86_x64.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall; Check: not IsRequiredDotNetDetected

Source: "C:\Users\proko_000\Documents\Visual Studio 2015\Projects\Communicator\Communicator\bin\Debug\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs


[Icons]

Name: "{group}\{#Name}"; Filename: "{app}\{#ExeName}"

Name: "{commondesktop}\{#Name}"; Filename: "{app}\{#ExeName}"; Tasks: desktopicon

[Code]

function IsDotNetDetected(version: string; release: cardinal): boolean;

var 
    reg_key: string; 
    success: boolean; 
    release45: cardinal; 
    key_value: cardinal; 
    sub_key: string;

begin

    success := false;
    reg_key := 'SOFTWARE\Microsoft\NET Framework Setup\NDP\';
    
    if Pos('v3.0', version) = 1 then
      begin
          sub_key := 'v3.0';
          reg_key := reg_key + sub_key;
          success := RegQueryDWordValue(HKLM, reg_key, 'InstallSuccess', key_value);
          success := success and (key_value = 1);
      end;

    if Pos('v3.5', version) = 1 then
      begin
          sub_key := 'v3.5';
          reg_key := reg_key + sub_key;
          success := RegQueryDWordValue(HKLM, reg_key, 'Install', key_value);
          success := success and (key_value = 1);
      end;

     if Pos('v4.0 Client Profile', version) = 1 then
      begin
          sub_key := 'v4\Client';
          reg_key := reg_key + sub_key;
          success := RegQueryDWordValue(HKLM, reg_key, 'Install', key_value);
          success := success and (key_value = 1);
      end;

     if Pos('v4.0 Full Profile', version) = 1 then
      begin
          sub_key := 'v4\Full';
          reg_key := reg_key + sub_key;
          success := RegQueryDWordValue(HKLM, reg_key, 'Install', key_value);
          success := success and (key_value = 1);
      end;

     if Pos('v4.5', version) = 1 then
      begin
          sub_key := 'v4\Full';
          reg_key := reg_key + sub_key;
          success := RegQueryDWordValue(HKLM, reg_key, 'Release', release45);
          success := success and (release45 >= release);
      end;
        
    result := success;

end;

function IsRequiredDotNetDetected(): boolean;
begin
    result := IsDotNetDetected('v4.0 Full Profile', 0);
end;

function InitializeSetup(): boolean;
begin

  if not IsDotNetDetected('v4.0 Full Profile', 0) then
    begin
      MsgBox('{#Name} requires Microsoft .NET Framework 4.0 Full Profile.'#13#13
             'The installer will attempt to install it', mbInformation, MB_OK);
    end;   

  result := true;
end;

[Run]

Filename: {tmp}\dotNetFx40_Full_x86_x64.exe; Parameters: "/q:a /c:""install /l /q"""; Check: not IsRequiredDotNetDetected; StatusMsg: Microsoft Framework 4.0 is installed. Please wait...

