// Component registry to prevent multiple instances of the same room component
class ComponentRegistry {
  constructor() {
    this.instances = new Map();
    this.mountAttempts = new Map();
  }

  canMount(key) {
    const attempts = this.mountAttempts.get(key) || 0;
    this.mountAttempts.set(key, attempts + 1);
    
    if (this.instances.has(key)) {
      console.log(`🚫 ComponentRegistry: Blocking mount attempt ${attempts + 1} for ${key} - instance already exists`);
      return false;
    }
    
    console.log(`✅ ComponentRegistry: Allowing mount attempt ${attempts + 1} for ${key}`);
    return true;
  }

  register(key, instanceId) {
    if (this.instances.has(key)) {
      console.warn(`⚠️ ComponentRegistry: Instance ${key} already registered, ignoring duplicate`);
      return false;
    }
    
    this.instances.set(key, instanceId);
    console.log(`📝 ComponentRegistry: Registered instance ${instanceId} for ${key}`);
    return true;
  }

  unregister(key) {
    if (this.instances.has(key)) {
      const instanceId = this.instances.get(key);
      this.instances.delete(key);
      this.mountAttempts.delete(key);
      console.log(`🗑️ ComponentRegistry: Unregistered instance ${instanceId} for ${key}`);
      return true;
    }
    return false;
  }

  isRegistered(key) {
    return this.instances.has(key);
  }

  getInstance(key) {
    return this.instances.get(key);
  }

  getMountAttempts(key) {
    return this.mountAttempts.get(key) || 0;
  }
}

export const componentRegistry = new ComponentRegistry();
