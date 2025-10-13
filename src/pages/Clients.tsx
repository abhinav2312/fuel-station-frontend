import { useEffect, useState } from 'react';
import { apiClient } from '../utils/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';

type Client = {
  id: number;
  name: string;
  ownerName: string;
  phone: string;
  address?: string;
  balance: string;
  creditLimit: string;
};

type FuelType = { id: number; name: string };

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [activeTab, setActiveTab] = useState<'record' | 'credits' | 'new'>('record');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [credits, setCredits] = useState<any[]>([]);
  const [creditFilters, setCreditFilters] = useState({
    clientId: '',
    fuelTypeId: '',
    status: '',
    startDate: '',
    endDate: ''
  });
  
  // New client form
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [sameAsName, setSameAsName] = useState(false);
  
  // Credit entry form
  const [selectedClient, setSelectedClient] = useState<number>();
  const [fuelTypeId, setFuelTypeId] = useState<number>();
  const [litres, setLitres] = useState<number>(0);
  const [pricePerLitre, setPricePerLitre] = useState<number>(0);
  const [date, setDate] = useState<string>(today());
  const [note, setNote] = useState('');
  const [currentPrices, setCurrentPrices] = useState<Record<number, number>>({});
  const [inputMode, setInputMode] = useState<'litres' | 'money'>('litres');
  const [moneyAmount, setMoneyAmount] = useState<number>(0);
  const [showSuccess, setShowSuccess] = useState(false);
  useEffect(() => {
    loadClients();
    loadFuelTypes();
    loadCurrentPrices();
  }, []);

  useEffect(() => {
    if (fuelTypeId && currentPrices[fuelTypeId]) {
      console.log('Setting price for fuel type', fuelTypeId, 'to', currentPrices[fuelTypeId]);
      setPricePerLitre(currentPrices[fuelTypeId]);
    } else if (fuelTypeId) {
      console.log('No price found for fuel type', fuelTypeId, 'available prices:', currentPrices);
    }
  }, [fuelTypeId, currentPrices]);

  useEffect(() => {
    if (activeTab === 'credits') {
      loadCredits();
    }
  }, [activeTab, creditFilters]);

  async function loadClients() {
    const r = await apiClient.get('/api/clients');
    setClients(r.data);
  }

  async function loadFuelTypes() {
    const r = await apiClient.get('/api/tanks');
    const unique = new Map<number, FuelType>();
    (r.data as any[]).forEach(t => {
      unique.set(t.fuelTypeId || t.fuelType?.id, { id: t.fuelTypeId || t.fuelType.id, name: t.fuelType?.name });
    });
    setFuelTypes(Array.from(unique.values()));
  }

  async function loadCurrentPrices() {
    try {
      const response = await apiClient.get('/api/prices/current');
      const prices: Record<number, number> = {};
      
      // Get fuel types from pumps to map fuel type IDs
      const pumpsResponse = await apiClient.get('/api/pumps');
      
      console.log('Prices API response:', response.data);
      console.log('Pumps API response:', pumpsResponse.data);
      
      pumpsResponse.data.forEach((pump: any) => {
        if (pump.fuelType) {
          const key = pump.fuelType.name.toLowerCase().replace(/\s+/g, '');
          console.log(`Mapping fuel type ${pump.fuelType.name} (ID: ${pump.fuelType.id}) to key: ${key}, price: ${response.data[key]}`);
          if (response.data[key] !== null && response.data[key] !== undefined) {
            prices[pump.fuelType.id] = response.data[key];
          }
        }
      });
      
      setCurrentPrices(prices);
      console.log('Loaded current prices:', prices);
    } catch (error) {
      console.error('Error loading current prices:', error);
    }
  }

  async function loadCredits() {
    const params = new URLSearchParams();
    if (creditFilters.clientId) params.append('clientId', creditFilters.clientId);
    if (creditFilters.fuelTypeId) params.append('fuelTypeId', creditFilters.fuelTypeId);
    if (creditFilters.status) params.append('status', creditFilters.status);
    if (creditFilters.startDate) params.append('startDate', creditFilters.startDate);
    if (creditFilters.endDate) params.append('endDate', creditFilters.endDate);
    
    const r = await apiClient.get(`/api/credits?${params.toString()}`);
    setCredits(r.data);
  }

  async function addClient() {
    if (!name || !phone) return;
    const owner = sameAsName ? name : ownerName;
    if (!owner) return;
    
    await axios.post('/api/clients', { name, ownerName: owner, phone, address });
    await loadClients();
    resetForms();
  }

  async function addCredit() {
    console.log('addCredit called with:', { selectedClient, fuelTypeId, pricePerLitre, litres, moneyAmount, inputMode });
    
    if (!selectedClient || !fuelTypeId || pricePerLitre === undefined || pricePerLitre === null) {
      console.log('addCredit validation failed:', { selectedClient, fuelTypeId, pricePerLitre });
      return;
    }
    
    let finalLitres = litres;
    let finalTotalAmount = 0;
    
    if (inputMode === 'money') {
      // Calculate litres from money amount
      finalLitres = moneyAmount / pricePerLitre;
      finalTotalAmount = moneyAmount;
    } else {
      // Calculate total from litres
      finalTotalAmount = litres * pricePerLitre;
    }
    
    try {
      console.log('Sending credit data:', { 
        fuelTypeId, 
        litres: finalLitres, 
        pricePerLitre, 
        totalAmount: finalTotalAmount,
        date, 
        note 
      });
      
      await axios.post(`/api/clients/${selectedClient}/credit`, { 
        fuelTypeId, 
        litres: finalLitres, 
        pricePerLitre, 
        totalAmount: finalTotalAmount,
        date, 
        note 
      });
      
      console.log('Credit added successfully');
      resetForms();
      await loadClients();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error recording credit:', error);
      alert('Failed to record credit');
    }
  }

  async function markAsPaid(creditId: number) {
    await axios.put(`/api/credits/${creditId}/mark-paid`);
    await loadCredits();
  }

  function resetFilters() {
    setCreditFilters({
      clientId: '',
      fuelTypeId: '',
      status: '',
      startDate: '',
      endDate: ''
    });
    loadCredits();
  }

  function startEditClient(client: Client) {
    setEditingClient(client);
    setName(client.name);
    setOwnerName(client.ownerName);
    setPhone(client.phone);
    setAddress(client.address || '');
    setSameAsName(false);
    setActiveTab('new'); // Switch to the third tab automatically
  }

  async function updateClient() {
    if (!editingClient || !name || !phone) return;
    const owner = sameAsName ? name : ownerName;
    if (!owner) return;
    
    await axios.put(`/api/clients/${editingClient.id}`, { 
      name, 
      ownerName: owner, 
      phone, 
      address
    });
    await loadClients();
    resetForms();
    setEditingClient(null);
  }

  function resetForms() {
    setName(''); 
    setOwnerName(''); 
    setPhone(''); 
    setAddress(''); 
    setSameAsName(false);
    setSelectedClient(undefined); 
    setFuelTypeId(undefined); 
    setLitres(0); 
    setPricePerLitre(0); 
    setNote('');
    setMoneyAmount(0);
    setInputMode('litres');
    setEditingClient(null);
  }

  // Validation functions
  const isNewClientValid = () => {
    const owner = sameAsName ? name : ownerName;
    return name && phone && owner;
  };

  const isCreditValid = () => {
    if (!selectedClient || !fuelTypeId || pricePerLitre === undefined || pricePerLitre === null) return false;
    
    if (inputMode === 'money') {
      return moneyAmount > 0;
    } else {
      return litres > 0;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Clients</h1>
      
      {/* Success Popup */}
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          Credit recorded successfully!
        </div>
      )}
      
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('record')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'record'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Record Credit
          </button>
          <button
            onClick={() => setActiveTab('credits')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'credits'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Credits
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'new'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Add/Update Client
          </button>
        </nav>
      </div>

      {/* New Client Tab */}
      {activeTab === 'new' && (
        <div className="bg-white rounded-xl border shadow-sm p-6 max-w-2xl">
          <h2 className="text-lg font-semibold mb-4">
            {editingClient ? 'Edit Client' : 'Add New Client'}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Company Name" value={name} onChange={e => setName(e.target.value)} />
            <Input label="Owner Name" value={ownerName} onChange={e => setOwnerName(e.target.value)} disabled={sameAsName} />
            <div className="flex items-center">
              <input type="checkbox" checked={sameAsName} onChange={e => setSameAsName(e.target.checked)} className="mr-2" />
              <label className="text-sm">Same as Company Name</label>
            </div>
            <Input label="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
            <Input label="Address (Optional)" value={address} onChange={e => setAddress(e.target.value)} />
          </div>
          <div className="flex gap-2 mt-4">
            <Button 
              onClick={editingClient ? updateClient : addClient} 
              disabled={!isNewClientValid()}
              className={!isNewClientValid() ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {editingClient ? 'Update Client' : 'Save Client'}
            </Button>
            <Button variant="ghost" onClick={resetForms}>Clear</Button>
            {editingClient && (
              <Button variant="ghost" onClick={() => setEditingClient(null)}>Cancel Edit</Button>
            )}
          </div>
        </div>
      )}

      {/* Record Credit Tab */}
      {activeTab === 'record' && (
        <>
          <div className="bg-white rounded-xl border shadow-sm p-6 max-w-2xl">
            <h2 className="text-lg font-semibold mb-4">Record Client Credit</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Select label="Client" value={selectedClient} onChange={e => setSelectedClient(Number(e.target.value))}>
                <option value="">Select Client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Select label="Fuel Type" value={fuelTypeId} onChange={e => setFuelTypeId(Number(e.target.value))}>
                <option value="">Select Fuel</option>
                {fuelTypes.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
              
              {/* Input Mode Toggle */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Input Mode</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="inputMode"
                      value="litres"
                      checked={inputMode === 'litres'}
                      onChange={e => setInputMode(e.target.value as 'litres' | 'money')}
                      className="mr-2"
                    />
                    Enter Litres
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="inputMode"
                      value="money"
                      checked={inputMode === 'money'}
                      onChange={e => setInputMode(e.target.value as 'litres' | 'money')}
                      className="mr-2"
                    />
                    Enter Money Amount
                  </label>
                </div>
              </div>
              
              {/* Conditional Input Fields */}
              {inputMode === 'litres' ? (
                <Input 
                  label="Litres" 
                  type="number" 
                  step="0.01"
                  value={litres || ''} 
                  onChange={e => {
                    const value = e.target.value;
                    if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                      setLitres(value === '' ? 0 : Number(value));
                    }
                  }} 
                />
              ) : (
                <Input 
                  label="Money Amount" 
                  type="number" 
                  step="0.01"
                  value={moneyAmount || ''} 
                  onChange={e => {
                    const value = e.target.value;
                    if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                      setMoneyAmount(value === '' ? 0 : Number(value));
                    }
                  }} 
                />
              )}
              
        <Input 
            label="Price per Litre" 
            type="number" 
            step="0.01" 
            value={pricePerLitre} 
            readOnly
            className="bg-gray-100"
        />
              
              <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
              <Input label="Note (Optional)" value={note} onChange={e => setNote(e.target.value)} />
              
              {/* Calculation Display */}
              {pricePerLitre > 0 && (
                <div className="md:col-span-2 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-800">
                    {inputMode === 'litres' ? (
                      <>
                        <strong>Total Amount:</strong> ₹{(litres * pricePerLitre).toFixed(2)}
                      </>
                    ) : (
                      <>
                        <strong>Litres:</strong> {(moneyAmount / pricePerLitre).toFixed(2)} L
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <Button 
                onClick={addCredit} 
                disabled={!isCreditValid()}
                className={!isCreditValid() ? 'opacity-50 cursor-not-allowed' : ''}
              >
                Record Credit
              </Button>
              <Button variant="ghost" onClick={resetForms}>Clear</Button>
            </div>
          </div>

          {/* All Clients Table - Only shown in Record Credit tab */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">All Clients</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients.map(client => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{client.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.ownerName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.phone}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Number(client.balance).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex gap-2">
                          <Button variant="ghost" onClick={() => { setSelectedClient(client.id); }}>Select for Credit</Button>
                          <Button variant="ghost" onClick={() => startEditClient(client)}>Edit</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* All Credits Tab */}
      {activeTab === 'credits' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Credit Filters</h2>
            <div className="grid md:grid-cols-5 gap-4">
              <Select label="Client" value={creditFilters.clientId} onChange={e => setCreditFilters({...creditFilters, clientId: e.target.value})}>
                <option value="">All Clients</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Select label="Fuel Type" value={creditFilters.fuelTypeId} onChange={e => setCreditFilters({...creditFilters, fuelTypeId: e.target.value})}>
                <option value="">All Fuel Types</option>
                {fuelTypes.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
              <Select label="Status" value={creditFilters.status} onChange={e => setCreditFilters({...creditFilters, status: e.target.value})}>
                <option value="">All Status</option>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
              </Select>
              <Input label="Start Date" type="date" value={creditFilters.startDate} onChange={e => setCreditFilters({...creditFilters, startDate: e.target.value})} />
              <Input label="End Date" type="date" value={creditFilters.endDate} onChange={e => setCreditFilters({...creditFilters, endDate: e.target.value})} />
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={loadCredits} variant="secondary">Apply Filters</Button>
              <Button onClick={resetFilters} variant="ghost">Reset Filters</Button>
            </div>
          </div>

          {/* Credits Table */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">All Credits</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fuel Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Litres</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price/L</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {credits.map(credit => (
                    <tr key={credit.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{credit.client?.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{credit.fuelType?.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Number(credit.litres).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Number(credit.pricePerLitre).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Number(credit.totalAmount).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(credit.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          credit.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {credit.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {credit.paidDate ? new Date(credit.paidDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {credit.status === 'unpaid' && (
                          <Button variant="ghost" onClick={() => markAsPaid(credit.id)}>Mark as Paid</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function today() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}


