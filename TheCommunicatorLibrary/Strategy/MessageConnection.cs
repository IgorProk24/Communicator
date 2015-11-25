using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Data.Entity;

namespace TheCommunicatorLibrary
{
    public class MessageConnection : IConnection
    {
        public string Connecting { get; set; }

        public void Connect(Contact one, Contact two)
        {
            throw new NotImplementedException();
        }

        public override string ToString()
        {
            return GetType().ToString();
        }
    }
}
