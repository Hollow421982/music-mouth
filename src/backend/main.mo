import Map "mo:core/Map";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Int "mo:core/Int";
import List "mo:core/List";



actor {
  type SoundMapping = {
    mouthSound : Text;
    instrument : Text;
  };

  module SoundMapping {
    public func compare(sound1 : SoundMapping, sound2 : SoundMapping) : Order.Order {
      switch (Text.compare(sound1.mouthSound, sound2.mouthSound)) {
        case (#equal) { Text.compare(sound1.instrument, sound2.instrument) };
        case (order) { order };
      };
    };
  };

  type InstrumentPreset = {
    name : Text;
    mappings : [SoundMapping];
  };

  module InstrumentPreset {
    public func compare(preset1 : InstrumentPreset, preset2 : InstrumentPreset) : Order.Order {
      Text.compare(preset1.name, preset2.name);
    };
  };

  type SessionRecord = {
    timestamp : Time.Time;
    kickCount : Nat;
    snareCount : Nat;
    hihatCount : Nat;
    bassCount : Nat;
    melodyCount : Nat;
  };

  module SessionRecord {
    public func compareByTimestamp(record1 : SessionRecord, record2 : SessionRecord) : Order.Order {
      Int.compare(record1.timestamp, record2.timestamp);
    };
  };

  type DetectedEvent = {
    time : Nat;
    soundType : Text;
    instrument : Text;
    intensity : Float;
  };

  type InstrumentalProject = {
    name : Text;
    bpm : Nat;
    timestamp : Time.Time;
    mappings : [SoundMapping];
    events : [DetectedEvent];
  };

  type ProjectEntry = {
    id : Nat;
    project : InstrumentalProject;
  };

  type ProjectWithId = {
    id : Nat;
    project : InstrumentalProject;
  };

  let presets = Map.empty<Text, InstrumentPreset>();
  let sessionRecords = List.empty<SessionRecord>();
  var nextProjectId = 0;
  let projects = Map.empty<Nat, InstrumentalProject>();

  public shared ({ caller }) func createPreset(name : Text, mappings : [SoundMapping]) : async () {
    if (presets.containsKey(name)) {
      Runtime.trap("Preset already exists");
    };
    let preset : InstrumentPreset = {
      name;
      mappings : [SoundMapping];
    };
    presets.add(name, preset);
  };

  public shared ({ caller }) func updatePreset(name : Text, mappings : [SoundMapping]) : async () {
    switch (presets.get(name)) {
      case (null) { Runtime.trap("Preset not found") };
      case (?_) {
        let updatedPreset : InstrumentPreset = {
          name;
          mappings : [SoundMapping];
        };
        presets.add(name, updatedPreset);
      };
    };
  };

  public shared ({ caller }) func deletePreset(name : Text) : async () {
    if (not presets.containsKey(name)) {
      Runtime.trap("Preset not found");
    };
    presets.remove(name);
  };

  public query ({ caller }) func getAllPresets() : async [InstrumentPreset] {
    presets.values().toArray().sort();
  };

  public query ({ caller }) func getPreset(name : Text) : async ?InstrumentPreset {
    presets.get(name);
  };

  public shared ({ caller }) func addSessionRecord(kickCount : Nat, snareCount : Nat, hihatCount : Nat, bassCount : Nat, melodyCount : Nat) : async () {
    let record : SessionRecord = {
      timestamp = Time.now();
      kickCount;
      snareCount;
      hihatCount;
      bassCount;
      melodyCount;
    };
    sessionRecords.add(record);
  };

  public query ({ caller }) func getAllSessionRecords() : async [SessionRecord] {
    sessionRecords.toArray().sort(SessionRecord.compareByTimestamp);
  };

  public shared ({ caller }) func createProject(name : Text, bpm : Nat, mappings : [SoundMapping], events : [DetectedEvent]) : async Nat {
    let project : InstrumentalProject = {
      name;
      bpm;
      timestamp = Time.now();
      mappings;
      events;
    };
    let id = nextProjectId;
    projects.add(id, project);
    nextProjectId += 1;
    id;
  };

  public shared ({ caller }) func updateProject(id : Nat, name : Text, bpm : Nat, mappings : [SoundMapping], events : [DetectedEvent]) : async () {
    switch (projects.get(id)) {
      case (null) { Runtime.trap("Project not found") };
      case (?_) {
        let updatedProject : InstrumentalProject = {
          name;
          bpm;
          timestamp = Time.now();
          mappings;
          events;
        };
        projects.add(id, updatedProject);
      };
    };
  };

  public shared ({ caller }) func deleteProject(id : Nat) : async () {
    if (not projects.containsKey(id)) {
      Runtime.trap("Project not found");
    };
    projects.remove(id);
  };

  public query ({ caller }) func getAllProjects() : async [ProjectWithId] {
    let entries = projects.toArray();
    entries.map(
      func((id, project)) {
        { id; project };
      }
    );
  };

  public query ({ caller }) func getProject(id : Nat) : async ?InstrumentalProject {
    projects.get(id);
  };
};
