using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Data.Entity;

namespace TheCommunicatorLibrary
{
    public class PhoneConnection : IConnection
    {
        public void Connect(Contact One, Contact Two)
        {
            
        }
        public override string ToString()
        {
            return GetType().ToString();
        }
    }
}
